function initLogin(onSuccess) {
  $("#loginForm").on("submit", async function (e) {
    e.preventDefault();

    const username = $("#loginUsername").val().trim();
    const password = $("#loginPassword").val();
    const $error = $("#loginError");
    const $btn = $("#loginBtn");

    $error.addClass("hidden").text("");

    if (!username || !password) {
      $error.removeClass("hidden").text("Please enter username and password.");
      return;
    }

    $btn.prop("disabled", true).text("Signing in...");

    try {
      const result = await window.electronAPI.login(username, password);

      if (result.success) {
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("loggedInUser", result.user.username);
        onSuccess();
      } else {
        $error
          .removeClass("hidden")
          .text(result.message || "Invalid username or password.");
        $("#loginPassword").val("").focus();
      }
    } catch (err) {
      $error.removeClass("hidden").text("Login failed. Please try again.");
    } finally {
      $btn.prop("disabled", false).text("Login");
    }
  });

  $("#loginUsername").focus();
}
