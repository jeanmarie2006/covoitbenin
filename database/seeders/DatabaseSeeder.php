<?php

namespace Database\Seeders;

use App\Models\Avis;
use App\Models\Lieu;
use App\Models\Message;
use App\Models\Reservation;
use App\Models\Trajet;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Données fictives : lieux réels (coordonnées approximatives), conducteurs, passagers, trajets et avis. */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        mt_srand(11);

        $lieux = [
            ['Dantokpa (marché)', 'Cotonou', 6.3654, 2.4383], ['Cadjèhoun', 'Cotonou', 6.3606, 2.3920], ['Akpakpa', 'Cotonou', 6.3541, 2.4560],
            ['Fidjrossè', 'Cotonou', 6.3530, 2.3620], ['Haie Vive', 'Cotonou', 6.3567, 2.3979], ['Aéroport Cardinal Bernardin Gantin', 'Cotonou', 6.3572, 2.3844],
            ['Kouhounou', 'Cotonou', 6.3760, 2.3880], ['Jéricho', 'Cotonou', 6.3733, 2.4030],
            ['Calavi centre', 'Abomey-Calavi', 6.4486, 2.3557], ['Campus universitaire (UAC)', 'Abomey-Calavi', 6.4184, 2.3423], ['Godomey', 'Abomey-Calavi', 6.3897, 2.3406],
            ['Togba', 'Abomey-Calavi', 6.4290, 2.3480], ['Arconville', 'Abomey-Calavi', 6.4610, 2.3467],
            ['Porto-Novo centre', 'Porto-Novo', 6.4969, 2.6036], ['Gare de Porto-Novo', 'Porto-Novo', 6.4948, 2.6089], ['Ouando', 'Porto-Novo', 6.5015, 2.6120],
            ['Ouidah centre', 'Ouidah', 6.3629, 2.0852], ['Sèmè-Podji', 'Sèmè-Podji', 6.3800, 2.6200], ['Allada', 'Allada', 6.6650, 2.1510],
        ];
        foreach ($lieux as [$nom, $ville, $lat, $lng]) {
            Lieu::create(compact('nom', 'ville', 'lat', 'lng'));
        }
        $L = fn (string $n) => Lieu::where('nom', 'like', "$n%")->firstOrFail()->id;

        $mk = fn ($nom, $email, $role, $tel, $bio = null) => User::create(['name' => $nom, 'email' => $email, 'password' => 'demo1234', 'role' => $role, 'telephone' => $tel, 'bio' => $bio, 'created_at' => now()->subDays(mt_rand(30, 300))]);
        $demoC = $mk('Koffi Adjovi', 'conducteur@covoitbenin.bj', 'conducteur', '+229 01 97 11 11 11', 'Enseignant à Calavi, je fais Cotonou tous les jours. Ponctuel et musique douce.');
        $demoP = $mk('Awa Sossou', 'passager@covoitbenin.bj', 'passager', '+229 01 96 22 22 22', 'Étudiante en Gestion à l’UAC.');
        $conducteurs = [$demoC,
            $mk('Rodrigue Dossa', 'rodrigue@covoitbenin.bj', 'conducteur', '+229 01 95 33 33 01', 'Chauffeur prudent, voiture climatisée.'),
            $mk('Mireille Tokpo', 'mireille@covoitbenin.bj', 'conducteur', '+229 01 94 33 33 02', 'Infirmière, trajets réguliers Porto-Novo – Cotonou.'),
            $mk('Bienvenu Hounkpè', 'bienvenu@covoitbenin.bj', 'conducteur', '+229 01 93 33 33 03', null),
            $mk('Nadège Ahouansou', 'nadege@covoitbenin.bj', 'conducteur', '+229 01 92 33 33 04', 'Départs tôt le matin vers Cotonou.'),
            $mk('Pascal Gbèdo', 'pascal@covoitbenin.bj', 'conducteur', '+229 01 91 33 33 05', 'Ouidah – Cotonou le week-end aussi.')];
        $passagers = [$demoP];
        foreach (['Serge Houngbo', 'Carine Mêdénou', 'Ibrahim Salami', 'Estelle Kiki', 'Modeste Fanou', 'Rachidath Bio', 'Fatou Dègbè'] as $i => $n) {
            $passagers[] = $mk($n, Str::slug($n).'@covoitbenin.bj', 'passager', '+229 01 6'.$i.' 44 44 0'.$i);
        }

        $vehicules = ['Toyota Corolla blanche', 'Toyota Yaris grise', 'Kia Rio bleue', 'Hyundai Accent noire', 'Peugeot 206 rouge', 'Nissan Almera argent'];
        $routes = [
            ['Calavi centre', 'Dantokpa', 7, 30, 800, 0], ['Godomey', 'Haie Vive', 7, 45, 500, 0], ['Porto-Novo centre', 'Cadjèhoun', 6, 45, 1200, 2],
            ['Togba', 'Akpakpa', 7, 0, 700, 4], ['Sèmè-Podji', 'Jéricho', 7, 15, 900, 1], ['Ouidah centre', 'Fidjrossè', 6, 30, 1000, 5],
            ['Dantokpa', 'Calavi centre', 17, 30, 800, 0], ['Haie Vive', 'Godomey', 18, 0, 500, 0], ['Cadjèhoun', 'Porto-Novo centre', 17, 45, 1200, 2],
            ['Akpakpa', 'Togba', 18, 15, 700, 3], ['Campus universitaire', 'Dantokpa', 8, 0, 600, 0], ['Aéroport', 'Calavi centre', 20, 0, 1000, 1],
            ['Arconville', 'Kouhounou', 6, 45, 700, 4], ['Allada', 'Cadjèhoun', 6, 15, 1500, 3],
        ];
        $futurs = [];
        foreach ($routes as $ri => [$a, $b, $h, $m, $prix, $ci]) {
            $serie = $ri % 3 === 0 ? (string) Str::uuid() : null;
            foreach (range(0, $serie ? 9 : 2) as $j) {
                $d = now()->addDays($j + ($serie ? 0 : mt_rand(0, 5)))->setTime($h, $m);
                if ($serie && $d->isWeekend()) {
                    continue;
                }
                if ($d->isPast()) {
                    $d->addDay();
                }
                $futurs[] = Trajet::create([
                    'conducteur_id' => $conducteurs[$ci]->id, 'depart_id' => $L($a), 'arrivee_id' => $L($b), 'depart_at' => $d, 'places' => mt_rand(2, 4), 'prix' => $prix,
                    'vehicule' => $vehicules[$ci], 'description' => $serie ? 'Trajet régulier tous les jours ouvrés.' : (mt_rand(0, 1) ? 'Bagages légers acceptés.' : null), 'serie' => $serie,
                ]);
            }
        }

        // Quelques réservations sur les trajets à venir (dont des demandes en attente pour le conducteur démo)
        foreach (array_slice($futurs, 0, 14) as $i => $t) {
            $p = $passagers[$i % count($passagers)];
            if ($p->id === $demoP->id && $i > 3) {
                continue;
            }
            $statut = $i % 4 === 0 ? 'en_attente' : 'confirmee';
            $r = Reservation::create(['trajet_id' => $t->id, 'passager_id' => $p->id, 'places' => 1, 'statut' => $statut, 'paiement_statut' => $statut === 'confirmee' && $i % 2 ? 'paye' : 'aucun', 'paiement_mode' => $statut === 'confirmee' && $i % 2 ? 'momo' : null, 'paiement_ref' => $statut === 'confirmee' && $i % 2 ? 'MOMO-'.strtoupper(Str::random(8)) : null]);
            if ($statut === 'confirmee') {
                Message::create(['reservation_id' => $r->id, 'user_id' => $p->id, 'contenu' => 'Bonjour, je serai devant la station. À quelle heure exactement ?']);
                Message::create(['reservation_id' => $r->id, 'user_id' => $t->conducteur_id, 'contenu' => 'Bonjour ! Départ à l’heure indiquée, je vous attends.']);
            }
        }
        // demande en attente pour le conducteur démo
        $tDemo = Trajet::where('conducteur_id', $demoC->id)->where('depart_at', '>', now())->orderBy('depart_at')->first();
        if ($tDemo && ! Reservation::where('trajet_id', $tDemo->id)->where('passager_id', $passagers[2]->id)->exists()) {
            Reservation::create(['trajet_id' => $tDemo->id, 'passager_id' => $passagers[2]->id, 'places' => 2, 'statut' => 'en_attente']);
        }

        // Historique : trajets effectués avec réservations confirmées et avis réciproques
        $comm = ['Conducteur ponctuel et voiture très propre, merci !', 'Trajet agréable, bonne conduite.', 'Un peu de retard mais très sympa.', 'Parfait, je recommande.', 'Ambiance calme, prix correct.'];
        foreach (range(1, 22) as $i) {
            $c = $conducteurs[$i % count($conducteurs)];
            [$a, $b, , , $prix] = $routes[$i % count($routes)];
            $t = Trajet::create(['conducteur_id' => $c->id, 'depart_id' => $L($a), 'arrivee_id' => $L($b), 'depart_at' => now()->subDays(mt_rand(1, 25))->setTime(mt_rand(6, 18), 0), 'places' => 3, 'prix' => $prix, 'vehicule' => $vehicules[$i % 6], 'statut' => 'termine']);
            foreach (array_rand($passagers, 2) as $k) {
                $p = $passagers[$k];
                $r = Reservation::create(['trajet_id' => $t->id, 'passager_id' => $p->id, 'places' => 1, 'statut' => 'confirmee', 'paiement_statut' => 'paye', 'paiement_mode' => ['momo', 'moov'][mt_rand(0, 1)], 'paiement_ref' => 'MOMO-'.strtoupper(Str::random(8))]);
                Avis::create(['reservation_id' => $r->id, 'auteur_id' => $p->id, 'cible_id' => $c->id, 'note' => mt_rand(0, 100) > 20 ? 5 : mt_rand(3, 4), 'commentaire' => $comm[array_rand($comm)]]);
                if (mt_rand(0, 100) > 40) {
                    Avis::create(['reservation_id' => $r->id, 'auteur_id' => $c->id, 'cible_id' => $p->id, 'note' => mt_rand(4, 5), 'commentaire' => 'Passager ponctuel et respectueux.']);
                }
            }
        }
        // Un trajet effectué du conducteur démo avec la passagère démo (pour tester la notation)
        $t = Trajet::create(['conducteur_id' => $demoC->id, 'depart_id' => $L('Calavi'), 'arrivee_id' => $L('Dantokpa'), 'depart_at' => now()->subHours(6), 'places' => 3, 'prix' => 800, 'vehicule' => $vehicules[0]]);
        Reservation::create(['trajet_id' => $t->id, 'passager_id' => $demoP->id, 'places' => 1, 'statut' => 'confirmee', 'paiement_statut' => 'paye', 'paiement_mode' => 'momo', 'paiement_ref' => 'MOMO-DEMO0001']);
    }
}
