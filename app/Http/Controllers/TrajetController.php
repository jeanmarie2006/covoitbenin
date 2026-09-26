<?php

namespace App\Http\Controllers;

use App\Models\Avis;
use App\Models\Lieu;
use App\Models\Reservation;
use App\Models\Trajet;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TrajetController extends Controller
{
    public function lieux(): JsonResponse
    {
        return response()->json(Lieu::orderBy('ville')->orderBy('nom')->get());
    }

    /** Note moyenne et nombre d'avis reçus, pour une liste d'utilisateurs. */
    public static function notes(iterable $ids): array
    {
        return Avis::whereIn('cible_id', collect($ids)->unique())->select('cible_id', DB::raw('round(avg(note),1) as moyenne'), DB::raw('count(*) as total'))
            ->groupBy('cible_id')->get()->keyBy('cible_id')->map(fn ($r) => ['moyenne' => (float) $r->moyenne, 'total' => (int) $r->total])->all();
    }

    private function format(Trajet $t, array $notes): array
    {
        return [
            'id' => $t->id, 'depart_at' => $t->depart_at->toIso8601String(), 'places' => $t->places, 'places_dispo' => $t->places_dispo,
            'prix' => $t->prix, 'vehicule' => $t->vehicule, 'description' => $t->description, 'statut' => $t->statut, 'serie' => $t->serie,
            'depart' => $t->depart, 'arrivee' => $t->arrivee,
            'conducteur' => ['id' => $t->conducteur->id, 'name' => $t->conducteur->name, 'bio' => $t->conducteur->bio, 'note' => $notes[$t->conducteur_id] ?? null],
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate(['depart' => 'nullable|integer', 'arrivee' => 'nullable|integer', 'date' => 'nullable|date', 'places' => 'nullable|integer|min:1|max:6', 'tri' => 'nullable|in:heure,prix']);
        $q = Trajet::with(['depart', 'arrivee', 'conducteur:id,name,bio', 'reservations'])->where('statut', 'ouvert')->where('depart_at', '>', now());
        $q->when($request->query('depart'), fn ($w, $v) => $w->where('depart_id', $v))
            ->when($request->query('arrivee'), fn ($w, $v) => $w->where('arrivee_id', $v))
            ->when($request->query('date'), fn ($w, $v) => $w->whereDate('depart_at', $v));
        $q->orderBy($request->query('tri') === 'prix' ? 'prix' : 'depart_at');
        $liste = $q->limit(60)->get();
        if ($p = (int) $request->query('places')) {
            $liste = $liste->filter(fn ($t) => $t->places_dispo >= $p)->values();
        }
        $notes = self::notes($liste->pluck('conducteur_id'));

        return response()->json($liste->map(fn ($t) => $this->format($t, $notes)));
    }

    public function show(Trajet $trajet): JsonResponse
    {
        $trajet->load(['depart', 'arrivee', 'conducteur:id,name,bio,created_at', 'reservations']);
        $notes = self::notes([$trajet->conducteur_id]);
        $avis = Avis::with('auteur:id,name')->where('cible_id', $trajet->conducteur_id)->latest()->limit(5)->get(['id', 'auteur_id', 'note', 'commentaire', 'created_at']);
        $faits = Trajet::where('conducteur_id', $trajet->conducteur_id)->where('statut', 'termine')->count();

        return response()->json([...$this->format($trajet, $notes), 'avis_conducteur' => $avis, 'trajets_effectues' => $faits, 'membre_depuis' => $trajet->conducteur->created_at->toDateString()]);
    }

    /** Publier un trajet, éventuellement récurrent (tous les jours ouvrés sur 1 à 4 semaines). */
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'conducteur', 403, 'Seuls les conducteurs peuvent publier un trajet.');
        $data = $request->validate([
            'depart_id' => ['required', 'exists:lieux,id'],
            'arrivee_id' => ['required', 'exists:lieux,id', 'different:depart_id'],
            'depart_at' => ['required', 'date', 'after:now'],
            'places' => ['required', 'integer', 'between:1,6'],
            'prix' => ['required', 'integer', 'between:100,50000'],
            'vehicule' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:240'],
            'recurrent' => ['sometimes', 'boolean'],
            'semaines' => ['required_if:recurrent,true', 'nullable', 'integer', 'between:1,4'],
        ], ['arrivee_id.different' => 'Le départ et l’arrivée doivent être différents.']);

        $base = Carbon::parse($data['depart_at']);
        $dates = [$base];
        $serie = null;
        if ($request->boolean('recurrent')) {
            $serie = (string) Str::uuid();
            $dates = [];
            for ($d = $base->copy(); $d->lt($base->copy()->addWeeks((int) $data['semaines'])); $d->addDay()) {
                if ($d->isWeekday()) {
                    $dates[] = $d->copy();
                }
            }
        }
        $ids = [];
        foreach ($dates as $d) {
            $ids[] = Trajet::create([
                'conducteur_id' => $request->user()->id, 'depart_id' => $data['depart_id'], 'arrivee_id' => $data['arrivee_id'], 'depart_at' => $d,
                'places' => $data['places'], 'prix' => $data['prix'], 'vehicule' => $data['vehicule'] ?? null,
                'description' => isset($data['description']) ? strip_tags($data['description']) : null, 'serie' => $serie,
            ])->id;
        }

        return response()->json(['created' => count($ids), 'first_id' => $ids[0]], 201);
    }

    /** Trajets du conducteur (à venir + historique) avec les demandes de réservation. */
    public function mesTrajets(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'conducteur', 403);
        $liste = Trajet::with(['depart', 'arrivee', 'conducteur:id,name,bio', 'reservations.passager:id,name,telephone'])
            ->where('conducteur_id', $request->user()->id)->orderByDesc('depart_at')->limit(80)->get();
        $notes = self::notes([$request->user()->id]);

        return response()->json($liste->map(fn ($t) => [...$this->format($t, $notes), 'reservations' => $t->reservations->map(fn ($r) => [
            'id' => $r->id, 'places' => $r->places, 'statut' => $r->statut, 'paiement_statut' => $r->paiement_statut, 'paiement_mode' => $r->paiement_mode,
            'passager' => ['id' => $r->passager->id, 'name' => $r->passager->name, 'telephone' => $r->statut === 'confirmee' ? $r->passager->telephone : null],
        ])]));
    }

    public function annuler(Request $request, Trajet $trajet): JsonResponse
    {
        abort_unless($trajet->conducteur_id === $request->user()->id, 403);
        abort_unless($trajet->statut === 'ouvert', 422, 'Ce trajet n’est plus ouvert.');
        DB::transaction(function () use ($trajet) {
            $trajet->update(['statut' => 'annule']);
            $trajet->reservations()->whereIn('statut', ['en_attente', 'confirmee'])->update(['statut' => 'annulee']);
        });

        return response()->json(['message' => 'Trajet annulé. Les passagers ont été prévenus dans leur espace.']);
    }

    public function terminer(Request $request, Trajet $trajet): JsonResponse
    {
        abort_unless($trajet->conducteur_id === $request->user()->id, 403);
        abort_unless($trajet->statut === 'ouvert', 422, 'Ce trajet n’est plus ouvert.');
        abort_if($trajet->depart_at->isFuture(), 422, 'Le trajet n’a pas encore eu lieu.');
        $trajet->update(['statut' => 'termine']);
        $trajet->reservations()->where('statut', 'en_attente')->update(['statut' => 'annulee']);

        return response()->json(['message' => 'Trajet marqué comme effectué. Vous pouvez maintenant noter vos passagers.']);
    }

    public function profil(User $user): JsonResponse
    {
        $notes = self::notes([$user->id]);

        return response()->json([
            'id' => $user->id, 'name' => $user->name, 'bio' => $user->bio, 'role' => $user->role, 'membre_depuis' => $user->created_at->toDateString(),
            'note' => $notes[$user->id] ?? null,
            'trajets_effectues' => $user->role === 'conducteur' ? Trajet::where('conducteur_id', $user->id)->where('statut', 'termine')->count()
                : Reservation::where('passager_id', $user->id)->where('statut', 'confirmee')->whereHas('trajet', fn ($q) => $q->where('statut', 'termine'))->count(),
            'avis' => Avis::with('auteur:id,name')->where('cible_id', $user->id)->latest()->limit(8)->get(['id', 'auteur_id', 'note', 'commentaire', 'created_at']),
        ]);
    }
}
