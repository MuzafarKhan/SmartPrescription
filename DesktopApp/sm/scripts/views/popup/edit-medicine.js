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
      var medicineGenericName = $("#medicineGenericName").val().trim();
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
        medicineGenericName,
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
      $("#addEditModel").removeData("copyFromId");
      loadPageContent("medicine");
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
          text: "Medicine Brand Name is required",
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

    function populateForm(result) {
      const medicine = result[0];
      $("#medicineGenericName").val(medicine.medicinegenericname || "");
      if (medicine.timingType) {
        $("#timingType").val(medicine.timingType);
        $(".timing-checkbox").prop("checked", false).prop("disabled", true);
      } else {
        $("#timingType").val("").prop("disabled", false);
        $("#morning").prop("checked", medicine.morning === 1);
        $("#afternoon").prop("checked", medicine.afternoon === 1);
        $("#night").prop("checked", medicine.night === 1);
        $(".timing-checkbox").prop("disabled", false);
      }
      $("#isPrintableOnPrescriptionCheckChecked").prop(
        "checked",
        medicine.isPrintableOnPrescription === 1
      );
      $("#durationnumber").val(medicine.durationnumber);
      $("#slctDuration").val(medicine.duration);
      $("#medicineType").val(medicine.medicinetype).trigger("change");
      if (medicine.medicinetype == "Inj") {
        $("#divinjType").show();
        $("#injType").val(medicine.injType);
      } else {
        $("#divinjType").hide();
      }
      $("#quantity").val(medicine.quantity);
      $("#moreDetails").val(medicine.moredetail);
    }

    function init(id) {
      $("#hdnId").html(id);
      $("#addMedicineModalLabel").text("Update Medicine");
      window.electronAPI
        .getMedicineById(id)
        .then((result) => {
          $("#medicineName").val(result[0].medicinename);
          populateForm(result);
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

    function initCopy(sourceId) {
      $("#hdnId").html("");
      $("#addMedicineModalLabel").text("Copy Medicine");
      window.electronAPI
        .getMedicineById(sourceId)
        .then((result) => {
          const source = result[0];
          $("#medicineName").val("");
          $("#medicineName").attr(
            "placeholder",
            source.medicinegenericname
              ? `New brand for ${source.medicinegenericname}`
              : "Enter new medicine brand name"
          );
          populateForm(result);
          $("#medicineName").focus();
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
    const copyFromId = $("#addEditModel").data("copyFromId");
    if (copyFromId) {
      initCopy(copyFromId);
    } else if (id) {
      init(id);
    } else {
      $("#addMedicineModalLabel").text("Add New Medicine");
    }
  });
