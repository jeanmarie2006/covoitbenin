<?php

namespace Tests\Feature;

use App\Models\Lieu;
use App\Models\Reservation;
use App\Models\Trajet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CovoitTest extends TestCase
{
    use RefreshDatabase;

    private Lieu $a;

    private Lieu $b;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Lieu::create(['nom' => 'Calavi', 'ville' => 'Abomey-Calavi', 'lat' => 6.44, 'lng' => 2.35]);
        $this->b = Lieu::create(['nom' => 'Dantokpa', 'ville' => 'Cotonou', 'lat' => 6.36, 'lng' => 2.43]);
    }

    private function user(string $role, string $email = null): User
    {
        return User::create(['name' => ucfirst($role), 'email' => $email ?? "$role@test.bj", 'password' => 'motdepasse', 'role' => $role, 'telephone' => '+229 01 97 00 00 00']);
    }

    private function trajet(User $c, int $places = 3, string $when = '+1 day'): Trajet
    {
        return Trajet::create(['conducteur_id' => $c->id, 'depart_id' => $this->a->id, 'arrivee_id' => $this->b->id, 'depart_at' => now()->modify($when), 'places' => $places, 'prix' => 800]);
    }

    public function test_inscription_conducteur_ou_passager_uniquement(): void
    {
        $base = ['name' => 'Awa', 'email' => 'awa@test.bj', 'password' => 'motdepasse', 'telephone' => '+229 01 97 00 00 00'];
        $this->postJson('/api/auth/register', $base + ['role' => 'passager'])->assertCreated();
        $this->postJson('/api/auth/register', ['email' => 'x@test.bj'] + $base + ['role' => 'admin'])->assertStatus(422)->assertJsonValidationErrors('role');
        $this->postJson('/api/auth/register', ['telephone' => 'abc'] + $base + ['email' => 'y@test.bj', 'role' => 'conducteur'])->assertStatus(422)->assertJsonValidationErrors('telephone');
    }

    public function test_recherche_par_itineraire_et_date(): void
    {
        $c = $this->user('conducteur');
        $this->trajet($c, 3, '+1 day');
        $this->getJson("/api/trajets?depart={$this->a->id}&arrivee={$this->b->id}")->assertOk()->assertJsonCount(1);
        $this->getJson("/api/trajets?depart={$this->b->id}")->assertOk()->assertJsonCount(0);
        $this->getJson('/api/trajets?date='.now()->addDay()->toDateString())->assertOk()->assertJsonCount(1);
        $this->getJson('/api/trajets?date='.now()->addDays(5)->toDateString())->assertOk()->assertJsonCount(0);
    }

    public function test_seul_un_conducteur_publie_et_un_trajet_recurrent_cree_les_jours_ouvres(): void
    {
        $p = $this->user('passager');
        $c = $this->user('conducteur');
        $body = ['depart_id' => $this->a->id, 'arrivee_id' => $this->b->id, 'depart_at' => now()->next('Monday')->setTime(7, 30)->toDateTimeString(), 'places' => 3, 'prix' => 800, 'recurrent' => true, 'semaines' => 2];
        $this->actingAs($p, 'sanctum')->postJson('/api/trajets', $body)->assertForbidden();
        $this->actingAs($c, 'sanctum')->postJson('/api/trajets', $body)->assertCreated()->assertJsonPath('created', 10);
        $this->assertSame(1, Trajet::distinct()->count('serie'));
        $this->actingAs($c, 'sanctum')->postJson('/api/trajets', ['arrivee_id' => $this->a->id] + $body)->assertStatus(422);
    }

    public function test_reservation_confirmation_et_places_disponibles(): void
    {
        $c = $this->user('conducteur');
        $p1 = $this->user('passager', 'p1@test.bj');
        $p2 = $this->user('passager', 'p2@test.bj');
        $t = $this->trajet($c, 2);

        $r1 = $this->actingAs($p1, 'sanctum')->postJson("/api/trajets/{$t->id}/reservations", ['places' => 2])->assertCreated()->json('id');
        $this->assertSame(2, $t->fresh()->places_dispo, 'une demande en attente ne bloque pas les places');
        $this->actingAs($p2, 'sanctum')->postJson("/api/trajets/{$t->id}/reservations", ['places' => 1])->assertCreated();
        $this->actingAs($p1, 'sanctum')->postJson("/api/trajets/{$t->id}/reservations", ['places' => 1])->assertStatus(422); // déjà réservé

        $this->actingAs($p1, 'sanctum')->postJson("/api/reservations/{$r1}/decision", ['action' => 'confirmer'])->assertForbidden(); // pas le conducteur
        $this->actingAs($c, 'sanctum')->postJson("/api/reservations/{$r1}/decision", ['action' => 'confirmer'])->assertOk();
        $this->assertSame(0, $t->fresh()->places_dispo);

        $r2 = Reservation::where('passager_id', $p2->id)->first();
        $this->actingAs($c, 'sanctum')->postJson("/api/reservations/{$r2->id}/decision", ['action' => 'confirmer'])->assertStatus(422); // plus de place
        $this->actingAs($p2, 'sanctum')->postJson("/api/trajets/{$t->id}/reservations", ['places' => 1])->assertStatus(422);
    }

    public function test_un_conducteur_ne_peut_pas_reserver(): void
    {
        $c = $this->user('conducteur');
        $t = $this->trajet($c);
        $this->actingAs($c, 'sanctum')->postJson("/api/trajets/{$t->id}/reservations", ['places' => 1])->assertForbidden();
    }

    public function test_paiement_mobile_money_apres_confirmation_seulement(): void
    {
        $c = $this->user('conducteur');
        $p = $this->user('passager');
        $t = $this->trajet($c);
        $r = Reservation::create(['trajet_id' => $t->id, 'passager_id' => $p->id, 'places' => 1]);

        $this->actingAs($p, 'sanctum')->postJson("/api/reservations/{$r->id}/payer", ['mode' => 'momo', 'numero' => '+229 01 96 00 00 00'])->assertStatus(422);
        $r->update(['statut' => 'confirmee']);
        $this->actingAs($p, 'sanctum')->postJson("/api/reservations/{$r->id}/payer", ['mode' => 'carte', 'numero' => '+229 01 96 00 00 00'])->assertStatus(422);
        $res = $this->actingAs($p, 'sanctum')->postJson("/api/reservations/{$r->id}/payer", ['mode' => 'momo', 'numero' => '+229 01 96 00 00 00'])->assertOk();
        $this->assertStringStartsWith('MOMO-', $res->json('paiement_ref'));
        $this->actingAs($p, 'sanctum')->postJson("/api/reservations/{$r->id}/payer", ['mode' => 'momo', 'numero' => '+229 01 96 00 00 00'])->assertStatus(422);
    }

    public function test_notation_reciproque_seulement_apres_le_trajet(): void
    {
        $c = $this->user('conducteur');
        $p = $this->user('passager');
        $t = $this->trajet($c);
        $r = Reservation::create(['trajet_id' => $t->id, 'passager_id' => $p->id, 'places' => 1, 'statut' => 'confirmee']);

        $this->actingAs($p, 'sanctum')->postJson("/api/reservations/{$r->id}/avis", ['note' => 5])->assertStatus(422);
        $t->update(['statut' => 'termine']);
        $this->actingAs($p, 'sanctum')->postJson("/api/reservations/{$r->id}/avis", ['note' => 5, 'commentaire' => 'Parfait'])->assertCreated();
        $this->actingAs($p, 'sanctum')->postJson("/api/reservations/{$r->id}/avis", ['note' => 4])->assertStatus(422); // déjà noté
        $this->actingAs($c, 'sanctum')->postJson("/api/reservations/{$r->id}/avis", ['note' => 4])->assertCreated();
        $this->getJson("/api/membres/{$c->id}")->assertJsonPath('note.moyenne', 5);
    }

    public function test_messagerie_reservee_aux_deux_participants(): void
    {
        $c = $this->user('conducteur');
        $p = $this->user('passager');
        $autre = $this->user('passager', 'autre@test.bj');
        $r = Reservation::create(['trajet_id' => $this->trajet($c)->id, 'passager_id' => $p->id, 'places' => 1, 'statut' => 'confirmee']);

        $this->actingAs($autre, 'sanctum')->getJson("/api/reservations/{$r->id}/messages")->assertForbidden();
        $this->actingAs($p, 'sanctum')->postJson("/api/reservations/{$r->id}/messages", ['contenu' => '<b>Bonjour</b>'])->assertCreated();
        $this->actingAs($c, 'sanctum')->getJson("/api/reservations/{$r->id}/messages")->assertOk()->assertJsonPath('0.contenu', 'Bonjour');
    }

    public function test_annulation_d_un_trajet_annule_les_reservations(): void
    {
        $c = $this->user('conducteur');
        $p = $this->user('passager');
        $t = $this->trajet($c);
        $r = Reservation::create(['trajet_id' => $t->id, 'passager_id' => $p->id, 'places' => 1, 'statut' => 'confirmee']);
        $this->actingAs($this->user('conducteur', 'autre@test.bj'), 'sanctum')->postJson("/api/trajets/{$t->id}/annuler")->assertForbidden();
        $this->actingAs($c, 'sanctum')->postJson("/api/trajets/{$t->id}/annuler")->assertOk();
        $this->assertSame('annulee', $r->fresh()->statut);
    }
}
