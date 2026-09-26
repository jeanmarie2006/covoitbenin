<?php

namespace App\Http\Controllers;

use App\Models\Avis;
use App\Models\Message;
use App\Models\Reservation;
use App\Models\Trajet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReservationController extends Controller
{
    /** Le passager demande une place ; le conducteur confirme ou refuse. */
    public function store(Request $request, Trajet $trajet): JsonResponse
    {
        abort_unless($request->user()->role === 'passager', 403, 'Seuls les passagers peuvent réserver une place.');
        $data = $request->validate(['places' => ['required', 'integer', 'between:1,4']]);
        abort_unless($trajet->statut === 'ouvert' && $trajet->depart_at->isFuture(), 422, 'Ce trajet n’est plus disponible.');
        abort_if($trajet->places_dispo < $data['places'], 422, "Il ne reste que {$trajet->places_dispo} place(s) sur ce trajet.");

        $existante = Reservation::where('trajet_id', $trajet->id)->where('passager_id', $request->user()->id)->first();
        if ($existante && in_array($existante->statut, ['en_attente', 'confirmee'], true)) {
            abort(422, 'Vous avez déjà une réservation sur ce trajet.');
        }
        $r = Reservation::updateOrCreate(
            ['trajet_id' => $trajet->id, 'passager_id' => $request->user()->id],
            ['places' => $data['places'], 'statut' => 'en_attente', 'paiement_statut' => 'aucun', 'paiement_mode' => null, 'paiement_ref' => null],
        );

        return response()->json($r, 201);
    }

    public function mine(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'passager', 403);
        $liste = Reservation::with(['trajet.depart', 'trajet.arrivee', 'trajet.conducteur:id,name,telephone', 'avis'])
            ->where('passager_id', $request->user()->id)->latest()->limit(60)->get();

        return response()->json($liste->map(fn ($r) => [
            'id' => $r->id, 'places' => $r->places, 'statut' => $r->statut, 'total' => $r->total, 'paiement_statut' => $r->paiement_statut, 'paiement_mode' => $r->paiement_mode, 'paiement_ref' => $r->paiement_ref,
            'a_note' => $r->avis->where('auteur_id', $request->user()->id)->isNotEmpty(),
            'trajet' => [
                'id' => $r->trajet->id, 'depart_at' => $r->trajet->depart_at->toIso8601String(), 'prix' => $r->trajet->prix, 'statut' => $r->trajet->statut,
                'depart' => $r->trajet->depart, 'arrivee' => $r->trajet->arrivee,
                'conducteur' => ['id' => $r->trajet->conducteur->id, 'name' => $r->trajet->conducteur->name, 'telephone' => $r->statut === 'confirmee' ? $r->trajet->conducteur->telephone : null],
            ],
        ]));
    }

    public function annuler(Request $request, Reservation $reservation): JsonResponse
    {
        abort_unless($reservation->passager_id === $request->user()->id, 403);
        abort_unless(in_array($reservation->statut, ['en_attente', 'confirmee'], true), 422, 'Cette réservation ne peut plus être annulée.');
        abort_if($reservation->trajet->statut !== 'ouvert', 422, 'Le trajet est terminé.');
        $reservation->update(['statut' => 'annulee']);

        return response()->json($reservation);
    }

    public function decision(Request $request, Reservation $reservation): JsonResponse
    {
        $trajet = $reservation->trajet;
        abort_unless($trajet->conducteur_id === $request->user()->id, 403);
        $action = $request->validate(['action' => ['required', 'in:confirmer,refuser']])['action'];
        abort_unless($reservation->statut === 'en_attente', 422, 'Cette demande a déjà été traitée.');

        return DB::transaction(function () use ($trajet, $reservation, $action) {
            $t = Trajet::whereKey($trajet->id)->lockForUpdate()->first();
            if ($action === 'confirmer' && $t->places_dispo < $reservation->places) {
                abort(422, "Plus assez de places ({$t->places_dispo} restante(s)).");
            }
            $reservation->update(['statut' => $action === 'confirmer' ? 'confirmee' : 'refusee']);

            return response()->json($reservation);
        });
    }

    /** Paiement Mobile Money simulé (MTN MoMo / Moov Money) : aucune transaction réelle n'est effectuée. */
    public function payer(Request $request, Reservation $reservation): JsonResponse
    {
        abort_unless($reservation->passager_id === $request->user()->id, 403);
        abort_unless($reservation->statut === 'confirmee', 422, 'Le paiement est possible une fois la réservation confirmée.');
        abort_if($reservation->paiement_statut === 'paye', 422, 'Cette réservation est déjà payée.');
        $data = $request->validate([
            'mode' => ['required', 'in:momo,moov'],
            'numero' => ['required', 'regex:/^\+?[0-9 .\-]{8,20}$/'],
        ], ['numero.regex' => 'Numéro Mobile Money invalide.']);
        $reservation->update(['paiement_statut' => 'paye', 'paiement_mode' => $data['mode'], 'paiement_ref' => strtoupper(($data['mode'] === 'momo' ? 'MOMO-' : 'MOOV-').Str::random(8))]);

        return response()->json($reservation);
    }

    // ---- Messagerie entre conducteur et passager d'une réservation
    private function participant(Request $request, Reservation $reservation): void
    {
        $id = $request->user()->id;
        abort_unless($reservation->passager_id === $id || $reservation->trajet->conducteur_id === $id, 403);
    }

    public function messages(Request $request, Reservation $reservation): JsonResponse
    {
        $this->participant($request, $reservation);

        return response()->json($reservation->messages()->with('user:id,name')->orderBy('id')->get()->map(fn ($m) => ['id' => $m->id, 'user_id' => $m->user_id, 'auteur' => $m->user->name, 'contenu' => $m->contenu, 'created_at' => $m->created_at->toIso8601String()]));
    }

    public function envoyer(Request $request, Reservation $reservation): JsonResponse
    {
        $this->participant($request, $reservation);
        abort_if(in_array($reservation->statut, ['refusee'], true), 422, 'La conversation est fermée.');
        $data = $request->validate(['contenu' => ['required', 'string', 'max:500']]);
        $m = Message::create(['reservation_id' => $reservation->id, 'user_id' => $request->user()->id, 'contenu' => strip_tags($data['contenu'])]);

        return response()->json(['id' => $m->id], 201);
    }

    // ---- Notation réciproque après un trajet effectué
    public function noter(Request $request, Reservation $reservation): JsonResponse
    {
        $this->participant($request, $reservation);
        abort_unless($reservation->statut === 'confirmee' && $reservation->trajet->statut === 'termine', 422, 'Vous pourrez noter après le trajet effectué.');
        $data = $request->validate(['note' => ['required', 'integer', 'between:1,5'], 'commentaire' => ['nullable', 'string', 'max:300']]);
        $moi = $request->user()->id;
        $cible = $moi === $reservation->passager_id ? $reservation->trajet->conducteur_id : $reservation->passager_id;
        abort_if(Avis::where('reservation_id', $reservation->id)->where('auteur_id', $moi)->exists(), 422, 'Vous avez déjà noté ce trajet.');
        $a = Avis::create(['reservation_id' => $reservation->id, 'auteur_id' => $moi, 'cible_id' => $cible, 'note' => $data['note'], 'commentaire' => isset($data['commentaire']) ? strip_tags($data['commentaire']) : null]);

        return response()->json($a, 201);
    }
}
