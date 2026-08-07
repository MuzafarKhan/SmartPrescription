$("#chief-complaint-section").load(
          "./sections/chief-complaint-section.html"
        );

$("#diagnosis-section").load("./sections/diagnosis-section.html");

$("#medicine-section").load("./sections/medicine-section.html");

$("#rehabilitation-aids-section").load(
          "./sections/rehabilitation-aids-section.html"
        );

$("#patient-instruction-section").load(
          "./sections/patient-instruction-section.html"
        );

$(document).ready(async function () {
    common.refreshSettings();
    // $("#bpTxtbox").mask("000/00");
    const settings = common.getSettings();
    const date = new Date();

    const defaultdate = common.getSettings()[0].defaultdate;
    const defaultday = common.getSettings()[0].defaultday;
    const defaultcomplaintunit = common.getSettings()[0].defaultcomplaintunit;
    const defaultcomplaintduration =
      common.getSettings()[0].defaultcomplaintduration;
    const defaultfollowupunit = common.getSettings()[0].defaultfollowupunit;
    const defaultfollowupduration =
      common.getSettings()[0].defaultfollowupduration;

    const surgeryDetailValues = common.getSettings()[0].surgeryDetailValues;

    var select = document.querySelector("#surgeryFurtherdetailSuggestions");
    surgeryDetailValues.split(",").forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    $("#txtDate").datepicker({
      dateFormat: "dd/mm/yy", //check change
      changeMonth: true,
      changeYear: true,
    });
    if (defaultdate) {
      $("#txtDate").datepicker("setDate", defaultdate);
    } else if (defaultday) {
      var addDays = 0;
      if (defaultday.toLowerCase() == "tomorrow") {
        addDays = 1;
      } else if (defaultday.toLowerCase() == "yesterday") {
        addDays = -1;
      }
      date.setDate(date.getDate() + addDays);

      $("#txtDate").datepicker("setDate", date);

      $(".duration-select").val(defaultcomplaintduration);
      $(".unit-select").val(defaultcomplaintunit);

      $(".default-followup-unit-select").val(defaultfollowupunit);
      $("#txtDefaultFollowUpDurationSettingInput").val(defaultfollowupduration);
    }

    const randomId = Math.floor(Math.random() * 10000000);
    $("#hdnPrescriptionUniqueId").val(randomId);
    //Load Full Patient Prescription_____________________________________________________
    const prescriptionUniqueId = $("#content").data("prescriptionUniqueId");
    $("#content").data("prescriptionUniqueId", "");

    if (prescriptionUniqueId) {
      $("#hdnPrescriptionUniqueId").val(prescriptionUniqueId);
      const allPatients = JSON.parse(localStorage.getItem("allPatients")) || {};
      var patientData = allPatients[prescriptionUniqueId];
      await populateFullPatientPrescription(patientData.patientInformation);
    } else {
      // NEW: Create a promise that resolves when all sections are loaded
      const sectionLoadPromises = [
        new Promise((resolve) => {
          $("#chief-complaint-section").load(
            "./sections/chief-complaint-section.html",
            resolve
          );
        }),
        new Promise((resolve) => {
          $("#medicine-section").load(
            "./sections/medicine-section.html",
            resolve
          );
        }),
        new Promise((resolve) => {
          $("#rehabilitation-aids-section").load(
            "./sections/rehabilitation-aids-section.html",
            resolve
          );
        }),
        new Promise((resolve) => {
          $("#patient-instruction-section").load(
            "./sections/patient-instruction-section.html",
            resolve
          );
        }),
      ];

      // Wait for all sections to load
      await Promise.all(sectionLoadPromises);

      // NEW: Verify containers exist before adding rows
      const verifyContainers = () => {
        const containers = [
          "#chiefComplaintsContainer tbody",
          "#medicineContainer tbody",
          "#rehabilitationAidsContainer tbody",
          "#patient-instructionContainer tbody",
        ];

        containers.forEach((selector) => {
          if (!$(selector).length) {
            throw new Error(`Container not found: ${selector}`);
          }
        });
      };

      try {
        verifyContainers();
        addNewComplaintRow();
        addNewMedicineRow();
        addNewRehabilitationAidRow();
        addNewPatientInstructionRow();
      } catch (error) {
        console.error("Failed to add default rows:", error);
        // Retry after a short delay if containers aren't ready
        setTimeout(() => {
          verifyContainers();
          addNewComplaintRow();
          addNewMedicineRow();
          addNewRehabilitationAidRow();
          addNewPatientInstructionRow();
        }, 100);
      }
    }

    // Select all checkboxes with class "syrgry-input"
    document.querySelectorAll(".syrgry-input").forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        // Uncheck all other checkboxes
        document.querySelectorAll(".syrgry-input").forEach((otherCheckbox) => {
          if (otherCheckbox !== this) {
            otherCheckbox.checked = false;
          }
        });

        // Debugging: Check the current state of checkboxes
        console.log("Selected checkbox:", this.id, "Checked:", this.checked);

        // Load data from localStorage if the checkbox is checked
        if (this.checked) {
          let value = "";
          switch (this.id) {
            case "laminectomyCheckChecked":
              value = JSON.parse(localStorage.getItem("laminectomy"));
              break;
            case "tPFCheckChecked":
              value = JSON.parse(localStorage.getItem("tpf"));
              break;
            case "craniotomyCheckChecked":
              value = JSON.parse(localStorage.getItem("craniotomy"));
              break;
            case "vPshuntCheckChecked":
              value = JSON.parse(localStorage.getItem("vpshunt"));
              break;
            case "mMCCheckChecked":
              value = JSON.parse(localStorage.getItem("mmc"));
              break;
          }
          if (
            value &&
            value.surgeryDataState &&
            value.surgeryDataState.unitsurgery &&
            value.surgeryDataState.durationsurgery &&
            value.surgeryDataState.patientSurgeryFurtherDetail
          ) {
            document.querySelector(".unit-surgery-select").value =
              value.surgeryDataState.unitsurgery;
            document.querySelector(".duration-surgery-select").value =
              value.surgeryDataState.durationsurgery;
            document.querySelector(".surgeryFurtherdetail-input").value =
              value.surgeryDataState.patientSurgeryFurtherDetail;
          }
        } else {
          document.querySelector(".unit-surgery-select").value = "";
          document.querySelector(".duration-surgery-select").value = 0;
          document.querySelector(".surgeryFurtherdetail-input").value = "";
        }
      });
    });

    document.querySelectorAll(".comorbidity-tab").forEach((button) => {
      button.addEventListener("click", function () {
        // Toggle the 'btn-success' and 'btn-danger' classes
        this.classList.toggle("btn-success");
        this.classList.toggle("btn-danger");
        prescriptionForm;
        $("#prescriptionForm").trigger("change");
      });
    });

    $(".tab").click(function () {
      var tabId = $(this).attr("id");
      if ($(this).hasClass("tab-unselected")) {
        $(this).removeClass("tab-unselected").addClass("tab-selected");
        $("input[name='comorbidities']").val(function (index, value) {
          return value + tabId + "+ve ";
        });
      } else {
        $(this).removeClass("tab-selected").addClass("tab-unselected");
        $("input[name='comorbidities']").val(function (index, value) {
          return value.replace(tabId + "+ve ", "");
        });
      }
    });

    // Toggle medicine options visibility
    $("#medicineButton").click(function () {
      $("#medicineOptions").toggleClass("d-none");
    });

    // Submit the form
    $("#prescriptionForm").submit(function (event) {
      event.preventDefault();
    });

    $("#printPrescription").on("click", async function () {
      let prescriptionData = await getPrescriptionData(true);
      await savePendingPatient(true);
      if (validatePrescriptionData(prescriptionData)) {
        openPrintData(prescriptionData, false, true);
        common.fillPatientCountBubble();
      }
    });

    $(document).on("keydown", async function (e) {
      // Ctrl+P for normal print
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault(); // Prevent default browser behavior
        e.stopPropagation(); // Stop event from bubbling

        // Add a flag to prevent multiple executions
        if (window.isPrinting) return;
        window.isPrinting = true;

        try {
          let prescriptionData = await getPrescriptionData(true);
          await savePendingPatient(true);
          if (validatePrescriptionData(prescriptionData)) {
            await openPrintData(prescriptionData, true, true);
          }
        } finally {
          window.isPrinting = false;
        }
      }

      // Similar for Ctrl+I
      if (e.ctrlKey && e.key === "i") {
        e.preventDefault();
        e.stopPropagation();

        if (window.isPrinting) return;
        window.isPrinting = true;

        try {
          let prescriptionData = await getPrescriptionData(true);
          await savePendingPatient(true);
          if (validatePrescriptionData(prescriptionData)) {
            await openPrintData(prescriptionData, true, false);
          }
        } finally {
          window.isPrinting = false;
        }
      }
    });
    const prescriptionForm = document.getElementById("prescriptionForm");

    $("#prescriptionForm,#diagnosisList,.comorbidity-tab").on(
      "change",
      async (event) => {
        debugger;
        savePendingPatient(false);
      }
    );

    $("#printOnThermal").on("click", async function () {
      let prescriptionData = await getPrescriptionData(true);
      await savePendingPatient(false);
      if (validatePrescriptionData(prescriptionData)) {
        await openPrintData(prescriptionData, false, false);
      }
    });
  });

  async function openPrintData(
    prescriptionData,
    quickPrint,
    isPrintPrescription
  ) {
    $("#addEditModel").load("views/popup/print.html", function () {
      // After loading, pass the id dynamically
      $("#addEditModel").data(
        "prescriptionData",
        JSON.stringify(prescriptionData)
      );
      $("#addEditModel").data("quickPrint", quickPrint);
      $("#addEditModel").data("isPrintPrescription", isPrintPrescription);

      savesurgerytolocalstorage();
    });
  }

  function savesurgerytolocalstorage() {
    var dataState = getPrescriptionData(false);
    localStorage.setItem("getPrescriptionData", JSON.stringify(dataState));

    var surgeryDataState = {
      surgeryDataState: {
        unitsurgery: $(".unit-surgery-select").val()
          ? $(".unit-surgery-select").val()
          : "",

        durationsurgery: $(".duration-surgery-select").val()
          ? $(".duration-surgery-select").val()
          : "",
        patientSurgeryFurtherDetail: $(".surgeryFurtherdetail-input").val()
          ? $(".surgeryFurtherdetail-input").val()
          : "",
      },
    };

    if (
      surgeryDataState &&
      surgeryDataState.surgeryDataState &&
      surgeryDataState.surgeryDataState.unitsurgery &&
      surgeryDataState.surgeryDataState.durationsurgery &&
      surgeryDataState.surgeryDataState.patientSurgeryFurtherDetail
    ) {
      if (
        dataState &&
        dataState.patientInformation &&
        dataState.patientInformation.laminectomy
      )
        localStorage.setItem("laminectomy", JSON.stringify(surgeryDataState));
      if (
        dataState &&
        dataState.patientInformation &&
        dataState.patientInformation.tpf
      )
        localStorage.setItem("tpf", JSON.stringify(surgeryDataState));
      if (
        dataState &&
        dataState.patientInformation &&
        dataState.patientInformation.vpshunt
      )
        localStorage.setItem("vpshunt", JSON.stringify(surgeryDataState));
      if (
        dataState &&
        dataState.patientInformation &&
        dataState.patientInformation.craniotomy
      )
        localStorage.setItem("craniotomy", JSON.stringify(surgeryDataState));
      if (
        dataState &&
        dataState.patientInformation &&
        dataState.patientInformation.mmc
      )
        localStorage.setItem("mmc", JSON.stringify(surgeryDataState));
    }
  }

  async function getPrescriptionData(isPrinted) {
    var prescriptionData = {
      patientInformation: {
        isPrinted: isPrinted,
        prescriptionUniqueId: $("#hdnPrescriptionUniqueId").val(),
        patientname: $("#txtName").val() ? $("#txtName").val() : "",
        patientage: $("#txtAge").val() ? $("#txtAge").val() : "",
        checkupDate: $("#txtDate").val() ? $("#txtDate").val() : "",
        dm: $("#DM").hasClass("btn-success"),
        htn: $("#HTN").hasClass("btn-success"),
        cva: $("#CVA").hasClass("btn-success"),
        cad: $("#CAD").hasClass("btn-success"),
        hepatitis: $("#HEPATITIS").hasClass("btn-success"),
        trauma: $("#TRAUMA").hasClass("btn-success"),
        laminectomy: $("#laminectomyCheckChecked").prop("checked"),
        tpf: $("#tPFCheckChecked").prop("checked"),
        craniotomy: $("#craniotomyCheckChecked").prop("checked"),
        vpshunt: $("#vPshuntCheckChecked").prop("checked"),
        mmc: $("#mMCCheckChecked").prop("checked"),
        unitsurgery: $(".unit-surgery-select").val()
          ? $(".unit-surgery-select").val()
          : "",

        durationsurgery: $(".duration-surgery-select").val()
          ? $(".duration-surgery-select").val()
          : "",
        patientSurgeryFurtherDetail: $(".surgeryFurtherdetail-input").val()
          ? $(".surgeryFurtherdetail-input").val()
          : "",

        complaintData: getAllComplaints(),
        selectedDiagnosis: getSelectedDiagnosis(),
        selectedInvestigation: await getSelectedInvestigation(),
        investigationMoreDetail: $(".investigation-detail-select").val()
          ? $(".investigation-detail-select").val()
          : "",
        selectedPlan: await getSelectedPlan(),
        gcs: $("#gcsTxtBox").val() ? $("#gcsTxtBox").val() : "",
        bp: $("#bpTxtbox").val() ? $("#bpTxtbox").val() : "",

        powerUL1: $("#powerUL1TxtBox").val() ? $("#powerUL1TxtBox").val() : "",
        powerUL2: $("#powerUL2TxtBox").val() ? $("#powerUL2TxtBox").val() : "",
        powerLL1: $("#powerLL1TxtBox").val() ? $("#powerLL1TxtBox").val() : "",
        powerLL2: $("#powerLL2TxtBox").val() ? $("#powerLL2TxtBox").val() : "",
        sensations: $("#select-sensations").val()
          ? $("#select-sensations").val()
          : "",
        feber: $("#select-feber").val() ? $("#select-feber").val() : "",
        reflexes: $("#select-reflexes").val()
          ? $("#select-reflexes").val()
          : "",
        sphincter: $("#select-sphincter").val()
          ? $("#select-sphincter").val()
          : "",
        slr: $("#select-slr").val() ? $("#select-slr").val() : "",
        PHALLENSIGN: $("#PHALLENSIGNCheckChecked").prop("checked"),
        TINNELSIGN: $("#TINNELSIGNCheckChecked").prop("checked"),
        SPERLINGSIGN: $("#SPERLINGSIGNCheckChecked").prop("checked"),
        HOFFSIGN: $("#HOFFSIGNCheckChecked").prop("checked"),

        selectedMedicines: getAllMedicines(),
        selectedRehabilitationAids: getRehabilitationAids(),
        selectedPatientInstructions: getAllPatientInstructions(),
        defaultfollowupunit: $(".default-followup-unit-select").val(),
        defaultfollowupduration: $(
          "#txtDefaultFollowUpDurationSettingInput"
        ).val(),
      },
    };
    return prescriptionData;
  }
  function getAllComplaints() {
    const complaints = [];

    // Loop through each row in the table body
    document
      .querySelectorAll("#chiefComplaintsContainer .complaint-row")
      .forEach((row) => {
        const complaintInput = row.querySelector(".complaint-input").value;
        const durationSelect = row.querySelector(".duration-select").value;
        const unitSelect = row.querySelector(".unit-select").value;

        // Push the data as an object into the complaints array
        complaints.push({
          complaint: complaintInput || null,
          duration: durationSelect || null,
          unit: unitSelect || null,
          sourceFromDiagnosis: row.classList.contains(
            "addedFromDiagnosisChange"
          ),
        });
      });

    return complaints;
  }
  function getSelectedDiagnosis() {
    const diagnosisSuggest = $("#diagnosisList").magicSuggest();
    const selectedDiagnoses = diagnosisSuggest.getSelection();

    // Map the selected diagnoses to an array of values
    const selectedValues = selectedDiagnoses.map((diagnosis) => diagnosis.name);

    return selectedValues;
  }
  async function getSelectedInvestigation() {
    const investigationSuggest = $("#investigationList").magicSuggest();
    let selectedInvestigations = investigationSuggest.getSelection();
    const selectedValues = selectedInvestigations.map((investigation) => [
      investigation.name,
      investigation.isPrintableOnPrescription,
    ]);

    return selectedValues;
  }

  async function getSelectedPlan() {
    const planSuggest = $("#planList").magicSuggest();
    let selectedPlans = planSuggest.getSelection();
    const selectedValues = selectedPlans.map((plan) => plan.name);
    return selectedValues;
  }

  function getAllMedicines() {
    const medicines = [];

    $("#medicineContainer .medicine-row").each(function () {
      const medicineRow = $(this);

      // Create an object for each medicine row
      const medicine = {
        medicinename: medicineRow.find(".medicine-input").val(),
        medicinetype: medicineRow.find(".medicine-type").val(),
        injType: medicineRow.find(".inj-type").val(),
        quantity: medicineRow.find(".quantity").val(),
        timingType: medicineRow.find(".timing-type").val(), // New field for timing type
        morning: medicineRow.find(".morning").is(":checked") ? 1 : 0, // Updated selector
        afternoon: medicineRow.find(".afternoon").is(":checked") ? 1 : 0, // Updated selector
        night: medicineRow.find(".night").is(":checked") ? 1 : 0, // Updated selector
        duration: medicineRow.find(".duration").val(), // Updated selector
        durationnumber: medicineRow.find(".duration-number").val(), // Updated selector
        isPrintableOnPrescription: medicineRow.find(".printable").is(":checked")
          ? 1
          : 0, // Updated selector
        moredetail: medicineRow.find(".more-detail").val(), // Updated selector
        sourceFromDiagnosis: medicineRow.hasClass("addedFromDiagnosisChange"),
      };

      // Add the object to the medicines array
      medicines.push(medicine);
    });

    return medicines;
  }
  function getRehabilitationAids() {
    const aidsData = [];

    // Loop through each rehabilitation-aids row
    $("#rehabilitationAidsContainer .rehabilitation-aids-row").each(
      function () {
        const rehabilitationAid = $(this)
          .find(".rehabilitation-aids-input")
          .val();
        const moreDetail = $(this).find(".moredetail-input").val();

        // Push the data to the aidsData array
        if (rehabilitationAid || moreDetail) {
          aidsData.push({
            name: rehabilitationAid,
            moreDetail: moreDetail,
            sourceFromDiagnosis: $(this).hasClass("addedFromDiagnosisChange"),
          });
        }
      }
    );

    return aidsData;
  }
  function getAllPatientInstructions() {
    const patientinstructions = [];

    $("#patient-instructionContainer .patient-instruction-row").each(
      function () {
        const patientinstructionRow = $(this);

        // Create an object for each patient-instruction row
        const patientinstruction = {
          title: patientinstructionRow.find(".patient-instruction-input").val(),
          detail: patientinstructionRow.find("[id^='textPInstDetail']").val(),
          sourceFromDiagnosis: patientinstructionRow.hasClass(
            "addedFromDiagnosisChange"
          ),
        };

        // Add the object to the patient-instructions array
        patientinstructions.push(patientinstruction);
      }
    );

    return patientinstructions;
  }

  function validatePrescriptionData(prescriptionData) {
    var patientInformation = prescriptionData.patientInformation;
    let isValid = true;
    if (!patientInformation.patientname) {
      $.toast({
        heading: "Error",
        text: `Patient Name is required`,
        showHideTransition: "fade",
        icon: "error",
        position: "top-right",
      });
      isValid = false;
    } else if (!patientInformation.patientage) {
      $.toast({
        heading: "Error",
        text: `Patient Age is required`,
        showHideTransition: "fade",
        icon: "error",
        position: "top-right",
      });
      isValid = false;
    } else if (!patientInformation.checkupDate) {
      $.toast({
        heading: "Error",
        text: `Patient Checkup Date is required`,
        showHideTransition: "fade",
        icon: "error",
        position: "top-right",
      });
      isValid = false;
    } else if (patientInformation.selectedDiagnosis.length <= 0) {
      $.toast({
        heading: "Error",
        text: `Atlease One Diagnosis is required`,
        showHideTransition: "fade",
        icon: "error",
        position: "top-right",
      });
      isValid = false;
    } else if (patientInformation.selectedDiagnosis.length <= 0) {
      $.toast({
        heading: "Error",
        text: `Atlease One Diagnosis is required`,
        showHideTransition: "fade",
        icon: "error",
        position: "top-right",
      });
      isValid = false;
    } else if (!attachMedicineValidated(patientInformation.selectedMedicines)) {
      isValid = false;
    }
    return isValid;
  }

  // Helper functions for adding new rows
  function addNewComplaintRow() {
    var complaintRow = common.getChiefComplaintRow();
    complaintRow = $(complaintRow);
    complaintRow.find(".complaint-input").val("");
    complaintRow
      .find(".duration-select")
      .val(common.getSettings()[0].defaultcomplaintduration);
    complaintRow
      .find(".unit-select")
      .val(common.getSettings()[0].defaultcomplaintunit);
    $("#chiefComplaintsContainer tbody").append(complaintRow);
  }

  function addNewMedicineRow() {
    var medicineRow = common.getMedicineRow();
    medicineRow = $(medicineRow);
    $("#medicineContainer tbody").append(medicineRow);
  }

  function addNewRehabilitationAidRow() {
    var rehabilitationAidRow = common.getRehabilitationAidRow();
    rehabilitationAidRow = $(rehabilitationAidRow);
    $("#rehabilitationAidsContainer tbody").append(rehabilitationAidRow);
  }

  function addNewPatientInstructionRow() {
    var patientInstructionRow = common.getPatientInstructionRow();
    patientInstructionRow = $(patientInstructionRow);
    $("#patient-instructionContainer tbody").append(patientInstructionRow);
  }

  async function populateFullPatientPrescription(patientData) {
    populateAllMedicines(patientData.selectedMedicines);
    populatePatientDetails(patientData);
    populateRehabilitationAids(patientData.selectedRehabilitationAids);
    populateAllPatientInstructions(patientData.selectedPatientInstructions);
    await populateDiagnosis(patientData.selectedDiagnosis);
    populateAllComplaints(patientData.complaintData);
    await populateInvestigation(
      patientData.selectedInvestigation,
      patientData.investigationMoreDetail
    );
    populatePlan(patientData.selectedPlan);
  }

  async function savePendingPatient(isPrinted) {
    try {
      const currentPatient = await getPrescriptionData(isPrinted);

      const prescriptionUniqueId =
        currentPatient.patientInformation.prescriptionUniqueId?.trim();

      const patientname = currentPatient.patientInformation.patientname?.trim();

      if (prescriptionUniqueId && patientname) {
        // Get existing patients or initialize empty object
        const allPatients =
          JSON.parse(localStorage.getItem("allPatients")) || {};

        // Add/update current patient data
        allPatients[prescriptionUniqueId] = currentPatient;

        // Save back to localStorage
        localStorage.setItem("allPatients", JSON.stringify(allPatients));

        console.log(`Saved data for patient: ${prescriptionUniqueId}`);
      }
    } catch (error) {
      console.error("Error saving patient data:", error);
    }
  }

  function populatePatientDetails(patientData) {
    $("#txtName").val(patientData.patientname);
    $("#txtAge").val(patientData.patientage);
    $("#txtDate").val(patientData.checkupDate);
    $(".comorbidity-tab").removeClass("btn-success");
    $("#DM").addClass(patientData.dm ? "btn-success" : "btn-danger");
    $("#HTN").addClass(patientData.htn ? "btn-success" : "btn-danger");
    $("#CVA").addClass(patientData.cva ? "btn-success" : "btn-danger");
    $("#CAD").addClass(patientData.cad ? "btn-success" : "btn-danger");
    $("#HEPATITIS").addClass(
      patientData.hepatitis ? "btn-success" : "btn-danger"
    );
    $("#TRAUMA").addClass(patientData.trauma ? "btn-success" : "btn-danger");

    $("#laminectomyCheckChecked").prop("checked", patientData.laminectomy);
    $("#tPFCheckChecked").prop("checked", patientData.tpf);
    $("#craniotomyCheckChecked").prop("checked", patientData.craniotomy);
    $("#vPshuntCheckChecked").prop("checked", patientData.vpshunt);
    $("#mMCCheckChecked").prop("checked", patientData.mmc);

    $(".unit-surgery-select").val(patientData.unitsurgery);
    $(".duration-surgery-select").val(patientData.durationsurgery);
    $(".surgeryFurtherdetail-input").val(
      patientData.patientSurgeryFurtherDetail
    );
    $("#gcsTxtBox").val(patientData.gcs);
    $("#bpTxtbox").val(patientData.bp);
    $("#powerUL1TxtBox").val(patientData.powerUL1);
    $("#powerUL2TxtBox").val(patientData.powerUL2);
    $("#powerLL1TxtBox").val(patientData.powerLL1);
    $("#powerLL2TxtBox").val(patientData.powerLL2);
    $("#select-sensations").val(patientData.sensations);
    $("#select-feber").val(patientData.feber);
    $("#select-reflexes").val(patientData.reflexes);
    $("#select-sphincter").val(patientData.sphincter);
    $("#select-slr").val(patientData.slr);

    $("#PHALLENSIGNCheckChecked").prop("checked", patientData.PHALLENSIGN);
    $("#TINNELSIGNCheckChecked").prop("checked", patientData.TINNELSIGN);
    $("#SPERLINGSIGNCheckChecked").prop("checked", patientData.SPERLINGSIGN);
    $("#HOFFSIGNCheckChecked").prop("checked", patientData.HOFFSIGN);

    $("#txtboxNextFollowUpDate").val(patientData.nextFollowUpDate);
  }
  async function populateDiagnosis(diagnosis) {
    try {
      const diagnosisListData = await window.electronAPI.getDiagnosis();

      // Initialize MagicSuggest and store the instance
      const diagnosisSuggest = $("#diagnosisList").magicSuggest({
        data: diagnosisListData,
        placeholder: "Type or select Investigation",
      });

      if (diagnosis.length > 0) {
        // Process both existing and new diagnoses
        const selection = diagnosis.map((name) => {
          // Try to find in diagnosisListData first
          const existing = diagnosisListData.find((item) => item.name === name);

          // If not found, create a new object with the name as both id and value
          return existing || { id: name, name: name };
        });

        // Set the combined selection
        diagnosisSuggest.setSelection(selection);
      }
    } catch (error) {
      console.error("Error loading diagnosis:", error);
    }
  }

  function populateAllComplaints(complaints) {
    if (complaints && complaints.length > 0) {
      // Clear existing rows before populating
      $("#chiefComplaintsContainer .complaint-row").remove();

      complaints.forEach((complaints, index) => {
        // For each medicine, either populate an existing row or add a new row
        if (index === 0) {
          populateChiefComplaintRow(complaints); // Populate the first row
        } else {
          const newRowHtml = common.getChiefComplaintRow(
            complaints.sourceFromDiagnosis
          ); // Create a new row
          $("#chiefComplaintsContainer tbody").append(newRowHtml);
          populateChiefComplaintRow(
            complaints,
            $("#chiefComplaintsContainer .complaint-row").last()
          ); // Populate the new row
        }
      });
    }
  }
  function populateChiefComplaintRow(complaints, row) {
    // If no row is passed, add a new one
    if (!row) {
      const newRowHtml = common.getChiefComplaintRow(
        complaints.sourceFromDiagnosis
      ); // Create a new row
      $("#chiefComplaintsContainer tbody").append(newRowHtml); // Append to the container
      row = $("#chiefComplaintsContainer .complaint-row").last(); // Select the newly added row
    }

    // Populate the row with the medicine data
    row.find(".complaint-input").val(complaints.complaint);
    row.find(".unit-select").val(complaints.unit);
    row.find(".duration-select").val(complaints.duration);
  }

  function populateAllMedicines(medicines) {
    if (medicines && medicines.length > 0) {
      // Clear existing rows before populating
      $("#medicineContainer .medicine-row").remove();

      medicines.forEach((medicine, index) => {
        // For each medicine, either populate an existing row or add a new row
        if (index === 0) {
          populateMedicineRow(medicine); // Populate the first row
        } else {
          const newRowHtml = common.getMedicineRow(
            medicine.sourceFromDiagnosis
          ); // Create a new row
          $("#medicineContainer tbody").append(newRowHtml);
          populateMedicineRow(
            medicine,
            $("#medicineContainer .medicine-row").last()
          ); // Populate the new row
        }
      });
    }
  }
  function populateMedicineRow(medicine, row) {
    // If no row is passed, add a new one
    if (!row) {
      const newRowHtml = common.getMedicineRow(medicine.sourceFromDiagnosis); // Create a new row
      $("#medicineContainer tbody").append(newRowHtml); // Append to the container
      row = $("#medicineContainer .medicine-row").last(); // Select the newly added row
    }

    // Populate the row with the medicine data
    row.find(".medicine-input").val(medicine.medicinename);
    row.find(".medicine-type").val(medicine.medicinetype).trigger("change");

    // Handle injection type if medicine is injection
    if (medicine.medicinetype === "Inj") {
      row.find(".inj-type").val(medicine.injType).removeClass("hidden");
    } else {
      row.find(".inj-type").addClass("hidden");
    }

    row.find(".quantity").val(medicine.quantity);
    // Handle timing options (mutually exclusive)
    if (medicine.timingType) {
      row.find(".timing-type").val(medicine.timingType).trigger("change");
      row.find(".timing-checkbox").prop("disabled", true);
    } else {
      row.find(".morning").prop("checked", medicine.morning);
      row.find(".afternoon").prop("checked", medicine.afternoon);
      row.find(".night").prop("checked", medicine.night);
      row.find(".timing-type").prop("disabled", true);
    }

    row.find(".printable").prop("checked", medicine.isPrintableOnPrescription);
    row.find(".duration-number").val(medicine.durationnumber);
    row.find(".duration").val(medicine.duration);
    row.find(".more-detail").val(medicine.moredetail);
  }
  async function populateInvestigation(
    investigations,
    investigationMoreDetail
  ) {
    $(".investigation-detail-select").val(investigationMoreDetail);
    try {
      const investigationListData = await window.electronAPI.getInvestigation();

      // Initialize MagicSuggest and store the instance
      const investigationSuggest = $("#investigationList").magicSuggest({
        data: investigationListData,
        placeholder: "Type or select Investigation",
      });

      if (investigations.length > 0) {
        // Find matching investigations by ID
        let investigationsToSelect = investigationListData.filter((item) =>
          investigations.some(
            (investigation) =>
              investigation[0].toLowerCase() === item.name.toLowerCase()
          )
        );

        investigationsToSelect = investigationsToSelect.filter(
          (value, index, self) =>
            index === self.findIndex((t) => t.id === value.id)
        );

        const customInvestigations = investigations
          .filter((item) => item[1] === null)
          .map((item) => ({
            id: item[0], // use name as id (like you did in Plan)
            name: item[0],
            isPrintableOnPrescription: null,
          }));

        investigationsToSelect = [
          ...investigationsToSelect,
          ...customInvestigations,
        ];

        // Use the MagicSuggest instance to set selection
        investigationSuggest.setSelection(investigationsToSelect);
      }
    } catch (error) {
      console.error("Error loading investigations:", error);
    }
  }
  async function populatePlan(plans) {
    try {
      const planListData = await window.electronAPI.getPlan();

      const planSuggest = $("#planList").magicSuggest({
        data: planListData,
        placeholder: "Type or select Investigation",
      });

      if (plans.length > 0) {
        const selection = plans.map((name) => {
          const existing = planListData.find((item) => item.name === name);
          return existing || { id: name, name: name };
        });

        // Set the combined selection
        planSuggest.setSelection(selection);
      }
    } catch (error) {
      console.error("Error loading plans:", error);
    }
  }

  function populateRehabilitationAids(rehabilitationAids) {
    if (rehabilitationAids && rehabilitationAids.length > 0) {
      // Clear existing rows before populating
      $("#rehabilitationAidsContainer .rehabilitation-aids-row").remove();

      rehabilitationAids.forEach((rehabilitationAid, index) => {
        // For each medicine, either populate an existing row or add a new row
        if (index === 0) {
          populateRehabilitationAidRow(rehabilitationAid); // Populate the first row
        } else {
          const newRowHtml = common.getRehabilitationAidRow(
            rehabilitationAid.sourceFromDiagnosis
          ); // Create a new row
          $("#rehabilitationAidsContainer tbody").append(newRowHtml);
          populateRehabilitationAidRow(
            rehabilitationAid,
            $("#rehabilitationAidsContainer .rehabilitation-aids-row").last()
          ); // Populate the new row
        }
      });
    }
  }
  function populateRehabilitationAidRow(rehabilitationAid, row) {
    // If no row is passed, add a new one
    if (!row) {
      const newRowHtml = common.getRehabilitationAidRow(
        rehabilitationAid.sourceFromDiagnosis
      ); // Create a new row
      $("#rehabilitationAidsContainer tbody").append(newRowHtml); // Append to the container
      row = $("#rehabilitationAidsContainer .rehabilitation-aids-row").last(); // Select the newly added row
    }
    // Populate the row with the medicine data
    row.find(".rehabilitation-aids-input").val(rehabilitationAid.name);
    row.find(".moredetail-input").val(rehabilitationAid.moreDetail);
  }

  function populateAllPatientInstructions(patientInstructions) {
    if (patientInstructions && patientInstructions.length > 0) {
      // Clear existing rows before populating
      $("#patient-instructionContainer .patient-instruction-row").remove();

      patientInstructions.forEach((patientInstruction, index) => {
        // For each medicine, either populate an existing row or add a new row
        if (index === 0) {
          populateAllPatientInstructionsRow(patientInstruction); // Populate the first row
        } else {
          const newRowHtml = common.getPatientInstructionRow(
            patientInstruction.sourceFromDiagnosis
          ); // Create a new row
          $("#patient-instructionContainer tbody").append(newRowHtml);
          populateAllPatientInstructionsRow(
            patientInstruction,
            $("#patient-instructionContainer .patient-instruction-row").last()
          ); // Populate the new row
        }
      });
    }
  }
  function populateAllPatientInstructionsRow(patientInstruction, row) {
    // If no row is passed, add a new one
    if (!row) {
      const newRowHtml = common.getPatientInstructionRow(
        patientInstruction.sourceFromDiagnosis
      ); // Create a new row
      $("#patient-instructionContainer tbody").append(newRowHtml); // Append to the container
      row = $("#patient-instructionContainer .patient-instruction-row").last(); // Select the newly added row
    }
    // Populate the row with the medicine data
    row.find(".patient-instruction-input").val(patientInstruction.title);
    row.find("#textPInstDetail").val(patientInstruction.detail);
  }

  //End Load Full Patient Prescription_____________________________________________________

  function attachMedicineValidated(medicinesArray) {
    let isValid = true;
    medicinesArray.forEach((medicine, index) => {
      if (isValid) {
        const error = {};

        // Check if medicine name is empty
        if (!medicine.medicinename.trim()) {
          $.toast({
            heading: "Error",
            text: `Medicine name is required in ( ROW ${index + 1} )`,
            showHideTransition: "fade",
            icon: "error",
            position: "top-right",
          });
          isValid = false;
        }
      }
    });

    return isValid;
  }

  function setDynamicDropdown(selectId, fetchFunction) {
    const multiSelect = new Choices(`#${selectId}`, {
      searchEnabled: true,
      removeItemButton: true,
    });

    // Fetch data dynamically based on input
    async function fetchOptions(query) {
      if (query) {
        try {
          const results = await fetchFunction(query);
          const options = results.map((item) => ({
            value: item.Id,
            label: item.label || item.Name || item.description, // Fallback for label
          }));

          return options;
        } catch (error) {
          console.error(`Error fetching options for ${selectId}:`, error);
          return [];
        }
      }
    }

    // Event listener for searching
    multiSelect.passedElement.element.addEventListener(
      "search",
      async function (event) {
        const query = event.detail.value;

        // Fetch new options based on search query
        const options = await fetchOptions(query);
        multiSelect.clearChoices();
        multiSelect.setChoices(options, "value", "label", true);
      }
    );

    // Event listener for selection changes
    document
      .querySelector(`#${selectId}`)
      .addEventListener("change", function (event) {
        const selectedOptions = Array.from(event.target.selectedOptions).map(
          (option) => option.value
        );
      });
  }
