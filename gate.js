// Levels are for registered students only. This runs in <head>, before the page paints:
// with no saved Supabase session the student goes straight to the login page, and comes
// back here after entering their code. student.js then double-checks the session itself.
(function () {
  var hasSession = false;
  try {
    for (var i = 0; i < localStorage.length; i += 1) {
      var key = localStorage.key(i);
      if (/^sb-.+-auth-token$/.test(key) && localStorage.getItem(key)) { hasSession = true; break; }
    }
  } catch (error) { /* storage blocked: treat as logged out */ }
  if (!hasSession) window.location.replace('/auth?next=' + encodeURIComponent(window.location.pathname));
})();
