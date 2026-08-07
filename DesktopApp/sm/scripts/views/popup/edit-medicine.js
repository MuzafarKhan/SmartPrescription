$(document).ready(function () {
    $("#addMedicineModal").modal("show");
    $("#saveMedicine").on("click", function () {
      if (medicineValidated()) {
        saveMedicine();
      }
    });
    $("#divinjType").hide();

    // Show/hide based on medicine type selection
    $("#medicineType").change(function () {
      if ($(this).val() === "Inj") {
        $("#divinjType").show();
      } else {
        $("#divinjType").hide();
      }
    });

    // Make timing options mutually exclusive
    $("#timingType").change(function () {
      if ($(this).val()) {
        $(".timing-checkbox").prop("checked", false).prop("disabled", true);
      } else {
        $(".timing-checkbox").prop("disabled", false);
      }
    });

    $(".timing-checkbox").change(function () {
      if ($(".timing-checkbox:checked").length > 0) {
        $("#timingType").val("").prop("disabled", true);
      } else {
        $("#timingType").prop("disabled", false);
      }
    });

    async function saveMedicine() {
      var id = $("#hdnId").html();
      var medicineName = $("#medicineName").val().trim();
      var timingType = $("#timingType").val().trim();
      var morning = $("#morning").prop("checked") ? 1 : 0;
      var afternoon = $("#afternoon").prop("checked") ? 1 : 0;
      var night = $("#night").prop("checked") ? 1 : 0;
      var isPrintableOnPrescription = $(
        "#isPrintableOnPrescriptionCheckChecked"
      ).prop("checked")
        ? 1
        : 0;
      var durationnumber = Number($("#durationnumber").val().trim());
      var duration = $("#slctDuration").val().trim();
      var medicineType = $("#medicineType").val().trim();
      var injType =
        $("#medicineType").val().trim() == "Inj"
          ? $("#injType").val().trim()
          : "";
      var quantity = $("#quantity").val().trim();
      var moreDetails = $("#moreDetails").val().trim();

      var medicineModel = {
        id,
        medicineName,
        timingType,
        morning,
        afternoon,
        night,
        isPrintableOnPrescription,
        durationnumber,
        duration,
        medicineType,
        injType,
        quantity,
        moreDetails,
      };
      if (id) {
        updateMedicine(id, medicineModel);
      } else {
        addMedicine(medicineModel);
      }
      $("#addMedicineModal").modal("hide");
      loadPageContent(
        "medicine",
        "medicineTable",
        $("#medicineTable").DataTable().page()
      );
    }

    async function updateMedicine(id, medicineModel) {
      const results = await window.electronAPI.updateMedicineById(
        id,
        medicineModel
      );
      common.showUpdatedSuccessfullyMessage();
    }

    async function addMedicine(medicineModel) {
      try {
        const results = await window.electronAPI.addMedicine(medicineModel);
        common.showSavedSuccessfullyMessage();
      } catch (error) {
        common.showErrorMessage(error);
      }
    }

    function medicineValidated() {
      if (!$("#medicineName").val().trim()) {
        $.toast({
          heading: "Error",
          text: "Medicine Name is required",
          showHideTransition: "fade",
          icon: "error",
          position: "top-right",
        });
        return false;
      }
      // Check if either timing type is selected or at least one checkbox is checked (but not both)
      const hasTimingType = $("#timingType").val();
      const hasCheckboxTiming = $(".timing-checkbox:checked").length > 0;

      if (!hasTimingType && !hasCheckboxTiming) {
        $.toast({
          heading: "Error",
          text: "Please select either a Timing Type or specific timings",
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
        .getMedicineById(id)
        .then((result) => {
          $("#medicineName").val(result[0].medicinename);
          if (result[0].timingType) {
            $("#timingType").val(result[0].timingType);
            $(".timing-checkbox").prop("disabled", true);
          } else {
            $("#morning").prop("checked", result[0].morning === 1);
            $("#afternoon").prop("checked", result[0].afternoon === 1);
            $("#night").prop("checked", result[0].night === 1);
          }
          $("#isPrintableOnPrescriptionCheckChecked").prop(
            "checked",
            result[0].isPrintableOnPrescription === 1
          );
          $("#durationnumber").val(result[0].durationnumber);
          $("#slctDuration").val(result[0].duration);
          $("#medicineType").val(result[0].medicinetype);
          if (result[0].medicinetype == "Inj") {
            $("#divinjType").show();
            $("#injType").val(result[0].injType);
          }

          $("#quantity").val(result[0].quantity);
          $("#moreDetails").val(result[0].moredetail);
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
