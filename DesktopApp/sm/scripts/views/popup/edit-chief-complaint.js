$(document).ready(function () {
    $("#addComplaintModal").modal("show");
    $("#saveComplaint").on("click", function () {
      if (complaintValidated()) {
        saveComplaints();
      }
    });

    async function saveComplaints() {
      var id = $("#hdnId").html();
      var complaintText = $("#complaintText").val().trim();

      if (id) {
        updateComplaints(id, complaintText);
      } else {
        addComplaint(complaintText);
      }
      $("#addComplaintModal").modal("hide");
      loadPageContent(
        "chief-complaint",
        "complaintsTable",
        $("#complaintsTable").DataTable().page()
      );
    }
    async function updateComplaints(id, complaintText) {
      const results = await window.electronAPI.updateChiefComplaint(
        id,
        complaintText
      );
      common.showUpdatedSuccessfullyMessage();
    }

    async function addComplaint(complaintText) {
      const results = await window.electronAPI.addChiefComplaint(complaintText);
      common.showSavedSuccessfullyMessage();
    }

    function complaintValidated() {
      if (!$("#complaintText").val().trim()) {
        $.toast({
          heading: "Error",
          text: "Complaint Text is required",
          showHideTransition: "fade",
          icon: "error",
          position: "top-right",
        });
        return false;
      }

      return true;
    }

    function init(id) {
      $("#hdnId").html(id);
      window.electronAPI
        .getChiefComplaintById(id)
        .then((result) => {
          $("#complaintText").val(result[0].Name);
        })
        .catch((error) => {
          $.toast({
            heading: "Error",
            text: "Error fetching data:",
            showHideTransition: "fade",
            icon: "error",
            position: "top-right",
          });
        });
    }
    const id = $("#addEditModel").data("id");
    if (id) {
      init(id);
    }
  });
