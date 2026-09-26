<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('telephone', 30)->nullable();
            $table->string('bio', 240)->nullable();
        });

        Schema::create('lieux', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 80);
            $table->string('ville', 60)->index();
            $table->decimal('lat', 9, 6);
            $table->decimal('lng', 9, 6);
        });

        Schema::create('trajets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conducteur_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('depart_id')->constrained('lieux');
            $table->foreignId('arrivee_id')->constrained('lieux');
            $table->dateTime('depart_at')->index();
            $table->unsignedTinyInteger('places');
            $table->unsignedInteger('prix');                       // FCFA par place
            $table->string('vehicule', 60)->nullable();
            $table->string('description', 240)->nullable();
            $table->string('statut', 10)->default('ouvert')->index(); // ouvert | termine | annule
            $table->string('serie', 36)->nullable()->index();          // trajets récurrents créés ensemble
            $table->timestamps();
        });

        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trajet_id')->constrained('trajets')->cascadeOnDelete();
            $table->foreignId('passager_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('places')->default(1);
            $table->string('statut', 12)->default('en_attente');       // en_attente | confirmee | refusee | annulee
            $table->string('paiement_statut', 10)->default('aucun');    // aucun | paye
            $table->string('paiement_mode', 10)->nullable();            // momo | moov | especes
            $table->string('paiement_ref', 24)->nullable();
            $table->timestamps();
            $table->unique(['trajet_id', 'passager_id']);
        });

        Schema::create('avis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained('reservations')->cascadeOnDelete();
            $table->foreignId('auteur_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('cible_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('note');
            $table->string('commentaire', 300)->nullable();
            $table->timestamps();
            $table->unique(['reservation_id', 'auteur_id']);
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained('reservations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('contenu', 500);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['messages', 'avis', 'reservations', 'trajets', 'lieux'] as $t) {
            Schema::dropIfExists($t);
        }
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['telephone', 'bio']));
    }
};
