<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reservation extends Model
{
    protected $table = 'reservations';

    protected $guarded = [];

    public function trajet(): BelongsTo
    {
        return $this->belongsTo(Trajet::class);
    }

    public function passager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'passager_id');
    }

    public function avis(): HasMany
    {
        return $this->hasMany(Avis::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function getTotalAttribute(): int
    {
        return $this->places * ($this->trajet?->prix ?? 0);
    }
}
