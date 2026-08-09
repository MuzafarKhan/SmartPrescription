$(document).ready(async function () {
  try {
    await common.refreshSettings();
    await common.applyAppZoom();
  } catch (error) {
    console.error("Failed to load settings on startup:", error);
  }

  if (!common.shouldAskForCredentials()) {
    startApp();
    return;
  }

  if (sessionStorage.getItem("isLoggedIn") === "true") {
    startApp();
  } else {
    showLoginScreen();
  }
});

function showLoginScreen() {
  $("#mainApp").addClass("hidden");
  $("#loginScreen")
    .removeClass("hidden")
    .load("./views/login.html", function () {
      initLogin(startApp);
    });
}

function logout() {
  Swal.fire({
    title: "Logout?",
    text: "Are you sure you want to logout?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Logout",
    cancelButtonText: "Cancel",
  }).then((result) => {
    if (!result.isConfirmed) return;

    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("loggedInUser");
    $("#content").empty();
    $("#addEditModel").empty();
    showLoginScreen();
  });
}

function startApp() {
  $("#loginScreen").addClass("hidden").empty();
  $("#mainApp").removeClass("hidden");

  if (common.shouldAskForCredentials()) {
    $("#logoutNav").show();
    $("#logoutBtn").off("click").on("click", function (e) {
      e.preventDefault();
      logout();
    });
  } else {
    $("#logoutNav").hide();
  }

  common.applyBehaviours();
  common.fillPatientCountBubble();
  $("#content").load("./views/home.html");

  $(".navbar-nav a:not(#logoutBtn), .navbar-brand").click(function (e) {
    e.preventDefault();
    var page = $(this).data("page");
    if (!page) return;

    $(".navbar-nav a").removeClass("active-nav");
    $(this).addClass("active-nav");
    loadPageContent(page);
  });
}

function loadPageContent(page, tableId, pageNumber) {
  var content = "";
  $("#addEditModel").html("");
  if (tableId) common.savePageNumber(tableId, pageNumber);
  common.fillPatientCountBubble();
  common.applyBehaviours();
  switch (page) {
    case "home":
      $("#content").load("./views/home.html");
      break;
    case "chief-complaint":
      $("#content").load("./views/chief-complaint.html");
      break;
    case "investigation":
      $("#content").load("./views/investigation.html");
      break;

    case "contact":
      $("#content").load("./views/contact.html");
      break;
    case "medicine":
      $("#content").load("./views/medicine.html");
      break;
    case "patient-instruction":
      $("#content").load("./views/patient-instruction.html");
      break;
    case "rehabilitation-aids":
      $("#content").load("./views/rehabilitation-aids.html");
      break;
    case "investigation":
      $("#content").load("./views/investigation.html");
      break;
    case "plan":
      $("#content").load("./views/plan.html");
      break;
    case "diagnosis":
      $("#content").load("./views/diagnosis.html");
      break;
    case "settings":
      $("#content").load("./views/settings.html");
      break;
    case "pending-patients":
      $("#content").load("./views/pending-patients.html");
      break;
    case "patient-history":
      $("#content").load("./views/patient-history.html");
      break;
    default:
      $("#content").html("<h1>Page Not Found</h1>");
  }
}
