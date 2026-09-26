<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Authentification par jetons Sanctum : on s'inscrit comme conducteur ou comme passager. */
class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:120', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:100'],
            'role' => ['required', Rule::in(['conducteur', 'passager'])],
            'telephone' => ['required', 'regex:/^\+?[0-9 .\-]{8,20}$/'],
        ], ['telephone.regex' => 'Numéro de téléphone invalide.']);
        $user = User::create([...$data, 'email' => strtolower($data['email'])]);

        return response()->json(['user' => $user, 'token' => $user->createToken('spa')->plainTextToken], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = User::where('email', strtolower($data['email']))->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['E-mail ou mot de passe incorrect.']]);
        }

        return response()->json(['user' => $user, 'token' => $user->createToken('spa')->plainTextToken]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }
}
