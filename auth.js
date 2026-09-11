/* Shared sign-in gate. Supabase RLS remains the authority for every request. */
window.requireCompanySignIn = function (client) {
  const panel = document.getElementById('company-auth');
  const content = document.getElementById('company-content');
  const form = document.getElementById('company-login');
  const message = document.getElementById('company-auth-message');
  const submit = form.querySelector('button');
  const signOut = document.getElementById('company-sign-out');
  let unlocked = false;
  let checking = false;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  function lock() {
    content.hidden = true;
    content.inert = true;
  }

  async function checkAccess() {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) {
      form.hidden = false;
      signOut.hidden = true;
      message.textContent = 'Sign in with your approved company account to access customers and invoices.';
      return;
    }
    signOut.hidden = false;
    const { data: allowed, error: accessError } = await client.rpc('cfmoto_owner_can_read');
    if (accessError) throw new Error('Could not verify company access. Please try signing in again.');
    if (allowed !== true) {
      message.textContent = 'This account is not approved for company access. Sign out and use your approved account.';
      return;
    }
    // Verify the protected table is reachable before exposing the editor.
    const { error: readError } = await client.from('customers').select('id').limit(0);
    if (readError) throw new Error('Your account is signed in, but customer access is unavailable. Contact your administrator.');
    unlocked = true;
    form.hidden = true;
    message.textContent = 'Signed in as ' + data.user.email;
    content.hidden = false;
    content.inert = false;
    resolveReady();
  }

  async function verify() {
    if (checking) return;
    checking = true;
    submit.disabled = true;
    try { await checkAccess(); }
    catch (error) { message.textContent = error.message || 'Connection failed. Please try again.'; }
    finally { checking = false; submit.disabled = false; }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (checking) return;
    checking = true;
    submit.disabled = true;
    message.textContent = 'Signing in…';
    try {
      const { error } = await client.auth.signInWithPassword({
        email: form.elements.email.value.trim(),
        password: form.elements.password.value
      });
      form.elements.password.value = '';
      if (error) throw error;
      await checkAccess();
    } catch (error) {
      message.textContent = error.message || 'Sign-in failed. Please try again.';
    } finally {
      form.elements.password.value = '';
      checking = false;
      submit.disabled = false;
    }
  });

  signOut.addEventListener('click', async () => {
    lock();
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) {
      message.textContent = 'Could not sign out. Please try again.';
      return;
    }
    location.reload();
  });

  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      lock();
      if (unlocked) location.reload();
    }
    // Never call Supabase asynchronously inside its auth callback.
    if (unlocked && (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
      lock();
      location.reload();
    }
  });
  lock();
  verify();
  return ready;
};
