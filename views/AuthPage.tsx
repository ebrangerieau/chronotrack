
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/Icon';

const AuthPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!isLoginView && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setIsLoading(false);
      return;
    }

    try {
      if (isLoginView) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err: any) {
      switch (err.code) {
        case 'auth/invalid-email':
          setError('Format d\'email invalide.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Email ou mot de passe incorrect.');
          break;
        case 'auth/email-already-in-use':
          setError('Cette adresse email est déjà utilisée.');
          break;
        case 'auth/weak-password':
          setError('Le mot de passe doit contenir au moins 6 caractères.');
          break;
        default:
          setError('Une erreur est survenue. Veuillez réessayer.');
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background-light dark:bg-background-dark">
      <div className="w-full max-w-sm">
        <header className="text-center mb-8">
            <Icon name="track_changes" className="text-5xl text-primary mx-auto" />
            <h1 className="text-3xl font-bold mt-2 text-text-light dark:text-text-dark">ChronoTrack</h1>
            <p className="text-text-subtle-light dark:text-text-subtle-dark">
              {isLoginView ? 'Connectez-vous à votre compte' : 'Créez un nouveau compte'}
            </p>
        </header>

        <main className="bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-md border border-border-light dark:border-border-dark">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-subtle-light dark:text-text-subtle-dark" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1 block w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-subtle-light dark:text-text-subtle-dark" htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isLoginView ? 'current-password' : 'new-password'}
                className="mt-1 block w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            {!isLoginView && (
              <div>
                <label className="text-sm font-medium text-text-subtle-light dark:text-text-subtle-dark" htmlFor="confirm-password">Confirmer le mot de passe</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="mt-1 block w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {error && <p className="text-sm text-negative text-center">{error}</p>}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-text-light bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark transition-colors disabled:bg-primary/50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Icon name="progress_activity" className="animate-spin" /> : (isLoginView ? 'Connexion' : 'Inscription')}
            </button>
          </form>

          <footer className="mt-6 text-center">
            <button onClick={() => { setIsLoginView(!isLoginView); setError(null); }} className="text-sm text-primary hover:underline">
              {isLoginView ? "Pas de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default AuthPage;