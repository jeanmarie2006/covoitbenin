<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Trajet extends Model
{
    protected $table = 'trajets';

    protected $guarded = [];

    protected $appends = ['places_dispo'];

    protected function casts(): array
    {
        return ['depart_at' => 'datetime'];
    }

    public function conducteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'conducteur_id');
    }

    public function depart(): BelongsTo
    {
        return $this->belongsTo(Lieu::class, 'depart_id');
    }

    public function arrivee(): BelongsTo
    {
        return $this->belongsTo(Lieu::class, 'arrivee_id');
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    /** Places restantes : seules les réservations confirmées occupent un siège. */
    public function getPlacesDispoAttribute(): int
    {
        $prises = $this->relationLoaded('reservations')
            ? $this->reservations->where('statut', 'confirmee')->sum('places')
            : $this->reservations()->where('statut', 'confirmee')->sum('places');

        return max(0, $this->places - (int) $prises);
    }
}
