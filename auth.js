// auth.js

function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

function isLoggedIn() {
  return !!getToken();
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// Update header buttons on every page
function updateHeaderAuthUI() {
  const headerActions = document.querySelector(".header-actions");
  if (!headerActions) return;

  if (isLoggedIn()) {
    const user = getUser();

    headerActions.innerHTML = `
      <span style="font-size: 14px;">Hi, ${user?.firstName || "User"}</span>
      <button class="btn btn-outline" onclick="logout()">Logout</button>
    `;
  } else {
    headerActions.innerHTML = `
      <a href="login.html" class="btn btn-primary">Sign In</a>
      <button class="mobile-menu-btn" onclick="toggleMobileMenu()">
        <i class="fas fa-bars"></i>
      </button>
    `;
  }
}
