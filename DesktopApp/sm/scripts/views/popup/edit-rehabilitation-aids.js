$(document).ready(function () {
    $("#addRehabilitationAidsModal").modal("show");
    $("#saveRehabilitationAids").on("click", function () {
      if (rehabilitationAidsValidated()) {
        saveRehabilitationAids();
      }
    });

    async function saveRehabilitationAids() {
      var id = $("#hdnId").html();
      var rehabilitationaidsText = $("#rehabilitationaidsText").val().trim();
      var moredetailText = $("#moredetailText").val().trim();

      if (id) {
        updateRehabilitationAids(id, rehabilitationaidsText, moredetailText);
      } else {
        addRehabilitationAids(rehabilitationaidsText, moredetailText);
      }
      $("#addRehabilitationAidsModal").modal("hide");
      loadPageContent(
        "rehabilitation-aids",
        "rehabilitationaidsTable",
        $("#rehabilitationaidsTable").DataTable().page()
      );
    }
    async function updateRehabilitationAids(id, name, moredetail) {
      const results = await window.electronAPI.updateRehabilitationAids(
        id,
        name,
        moredetail
      );
      common.showUpdatedSuccessfullyMessage();
    }

    async function addRehabilitationAids(name, moredetail) {
      const results = await window.electronAPI.addRehabilitationAids(
        name,
        moredetail
      );
      common.showSavedSuccessfullyMessage();
    }

    function rehabilitationAidsValidated() {
      if (!$("#rehabilitationaidsText").val().trim()) {
        $.toast({
          heading: "Error",
          text: "Rehabilitation Aids Text is required",
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
        .getRehabilitationAidsById(id)
        .then((result) => {
          $("#rehabilitationaidsText").val(result[0].name);
          $("#moredetailText").val(result[0].moredetail);
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
