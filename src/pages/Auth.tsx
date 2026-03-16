import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Leaf, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { z } from 'zod';

const emailSchema = z.string().email('Μη έγκυρη διεύθυνση email');
const passwordSchema = z.string().min(6, 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
type AuthView = 'login' | 'signup' | 'forgot' | 'reset';

export default function Auth() {
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<AuthView>('login');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false); // Added state for Facebook
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');

  const isRecoveryLink =
    window.location.hash.includes('type=recovery') ||
    new URLSearchParams(window.location.search).get('type') === 'recovery';

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error('Σφάλμα σύνδεσης με Google: ' + error.message);
      setIsGoogleLoading(false);
    }
  };

  // Added Facebook Handler
  const handleFacebookSignIn = async () => {
    setIsFacebookLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error('Σφάλμα σύνδεσης με Facebook: ' + error.message);
      setIsFacebookLoading(false);
    }
  };

  useEffect(() => {
    // Initial session check
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (isRecoveryLink) {
        setIsRecoveryMode(true);
        setView('reset');
      }
      setIsAuthenticated(!!data.session);
      setAuthLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const recoveryMode = event === 'PASSWORD_RECOVERY' || isRecoveryLink;
      if (recoveryMode) {
        setIsRecoveryMode(true);
        setView('reset');
      } else if (!session) {
        setIsRecoveryMode(false);
      }
      setIsAuthenticated(!!session);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [isRecoveryLink]);

  useEffect(() => {
    if (isAuthenticated && !isRecoveryMode) navigate('/');
  }, [isAuthenticated, isRecoveryMode, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Λάθος email ή κωδικός');
      } else {
        toast.error('Σφάλμα σύνδεσης: ' + error.message);
      }
    } else {
      toast.success('Επιτυχής σύνδεση!');
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: signupName ? { full_name: signupName } : undefined,
      },
    });
    setIsLoading(false);

    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('Αυτό το email χρησιμοποιείται ήδη');
      } else {
        toast.error('Σφάλμα εγγραφής: ' + error.message);
      }
    } else {
      toast.success('Επιτυχής εγγραφή! Καλώς ήρθατε!');
      navigate('/');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(forgotEmail);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setIsLoading(false);

    if (error) {
      toast.error('Σφάλμα αποστολής email επαναφοράς: ' + error.message);
      return;
    }

    setLoginEmail(forgotEmail);
    toast.success('Αν υπάρχει λογαριασμός για αυτό το email, στάλθηκε σύνδεσμος επαναφοράς.');
    setView('login');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      passwordSchema.parse(resetPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    if (resetPassword !== resetPasswordConfirm) {
      toast.error('Οι κωδικοί δεν ταιριάζουν');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: resetPassword,
    });
    setIsLoading(false);

    if (error) {
      toast.error('Σφάλμα αλλαγής κωδικού: ' + error.message);
      return;
    }

    setResetPassword('');
    setResetPasswordConfirm('');
    setIsRecoveryMode(false);
    toast.success('Ο κωδικός άλλαξε επιτυχώς!');
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-14 h-14 rounded-2xl gradient-hero flex items-center justify-center shadow-glow">
          <Leaf className="w-8 h-8 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trakteras</h1>
          <p className="text-sm text-muted-foreground">AI Γεωργικός Βοηθός</p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {view === 'forgot'
              ? 'Επαναφορά κωδικού'
              : view === 'reset'
                ? 'Ορίστε νέο κωδικό'
                : 'Καλώς ήρθατε'}
          </CardTitle>
          <CardDescription>
            {view === 'forgot'
              ? 'Συμπληρώστε το email σας για να λάβετε σύνδεσμο επαναφοράς'
              : view === 'reset'
                ? 'Πληκτρολογήστε τον νέο σας κωδικό για να ολοκληρώσετε την επαναφορά'
                : 'Συνδεθείτε ή δημιουργήστε λογαριασμό για να συνεχίσετε'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {view === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Αποστολή...
                  </>
                ) : (
                  'Αποστολή συνδέσμου επαναφοράς'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setView('login')}
                disabled={isLoading}
              >
                Επιστροφή στη σύνδεση
              </Button>
            </form>
          ) : view === 'reset' ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password">Νέος κωδικός</Label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="Τουλάχιστον 6 χαρακτήρες"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-password-confirm">Επιβεβαίωση νέου κωδικού</Label>
                <Input
                  id="reset-password-confirm"
                  type="password"
                  placeholder="Επαναλάβετε τον νέο κωδικό"
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Αποθήκευση...
                  </>
                ) : (
                  'Αλλαγή κωδικού'
                )}
              </Button>
            </form>
          ) : (
            <>
              {/* Google Sign In */}
              <Button
                variant="outline"
                className="w-full mb-2 gap-2" 
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isFacebookLoading || isLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Σύνδεση με Google
              </Button>

              {/* Facebook Sign In - NEW */}
              <Button
                variant="outline"
                className="w-full mb-4 gap-2"
                onClick={handleFacebookSignIn}
                disabled={isGoogleLoading || isFacebookLoading || isLoading}
              >
                {isFacebookLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
                Σύνδεση με Facebook
              </Button>

              <div className="relative mb-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                  ή
                </span>
              </div>

              <Tabs
                value={view === 'signup' ? 'signup' : 'login'}
                onValueChange={(value) => setView(value === 'signup' ? 'signup' : 'login')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Σύνδεση</TabsTrigger>
                  <TabsTrigger value="signup">Εγγραφή</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Κωδικός</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto px-0 text-sm"
                      onClick={() => {
                        setForgotEmail(loginEmail);
                        setView('forgot');
                      }}
                      disabled={isLoading}
                    >
                      Ξεχάσατε τον κωδικό;
                    </Button>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Σύνδεση...
                        </>
                      ) : (
                        'Σύνδεση'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Όνομα (προαιρετικό)</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Το όνομά σας"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Κωδικός</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Τουλάχιστον 6 χαρακτήρες"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Εγγραφή...
                        </>
                      ) : (
                        'Δημιουργία Λογαριασμού'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-sm text-muted-foreground text-center">
        Συνεχίζοντας, αποδέχεστε τους όρους χρήσης
      </p>
    </div>
  );
}
