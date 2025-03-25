const common = {
  // Method to get query string parameters
  getQueryParam: function (param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  },
  showSavedSuccessfullyMessage() {
    $.toast({
      heading: "Success",
      text: "Saved Successfully....",
      showHideTransition: "fade",
      icon: "success",
      position: "top-right",
    });
  },
  showUpdatedSuccessfullyMessage() {
    $.toast({
      heading: "Success",
      text: "Updated Successfully....",
      showHideTransition: "fade",
      icon: "success",
      position: "top-right",
    });
  },
  showDeletedSuccessfullyMessage() {
    $.toast({
      heading: "Success",
      text: "Deleted Successfully....",
      showHideTransition: "fade",
      icon: "success",
      position: "top-right",
    });
  },
  showErrorMessage(message) {
    $.toast({
      heading: "Error",
      text: message,
      showHideTransition: "fade",
      icon: "error",
      position: "top-right",
    });
  },
  getdbFilePath() {
    const path = require("path");

    const dbPath = process.env.IaminDevMode
      ? path.resolve(__dirname, "preData.db")
      : path.join(process.resourcesPath, "preData.db");
    if (dbPath)
      return path.join(__dirname, "preData.db"); // Use for development
    else return path.join(process.resourcesPath, "preData.db"); // Use for development
  },
  getMedicineRow() {
    const newRowHtml = `
         <tr class="medicine-row">
          <td>
            <input
              type="text"
              class="form-control medicine-input"
              placeholder="Enter Medicine"
              list="medicineSuggestions"
              required
            />

            <!-- Suggestions -->
            <datalist id="medicineSuggestions"> </datalist>
          </td>
          <td>
            <select
              id="medicineType"
              class="form-select"
              name="medicineType"
              required
            >
              <option value="">Select Type</option>
              <option value="Tab">TAB</option>
              <option value="Cap">CAP</option>
              <option value="Syrup">SYP</option>
              <option value="Inj">INJ</option>
              <option value="Cream">CREAM</option>
            </select>
          </td>
          <td>
            <input
              type="text"
              class="form-control"
              id="quantity"
              placeholder="1 Tab - 1 Spoon"
              required
            />
          </td>
          <td>
            <div style="text-align: center">
              <input
                class="form-check-input"
                type="checkbox"
                id="inlineMorning"
              />&nbsp;&nbsp;/&nbsp;&nbsp;
              <input
                class="form-check-input"
                type="checkbox"
                id="inlineAfternoon"
              />&nbsp;&nbsp;/&nbsp;&nbsp;
              <input
                class="form-check-input"
                type="checkbox"
                id="inlineNight"
              />
            </div>
          </td>
          <td>
            <input
              class="form-check-input"
              type="checkbox"
              id="beforeMealCheckChecked"
            />
          </td>
          <td>
            <div class="row">
              <div class="col-6">
                <input
                  type="number"
                  class="form-control"
                  id="durationnumber"
                  placeholder="1"
                  value="1"
                  required
                />
              </div>
              <div class="col-6">
                <select id="slctDuration" class="form-select" required>
                  <option value="">Select Duration</option>
                  <option value="day">day</option>
                  <option value="week" selected>week</option>
                  <option value="month">month</option>
                  <option value="year">year</option>
                </select>
              </div>
            </div>
          </td>

          <td>
            <input
              type="text"
              class="form-control"
              id="moredetail"
              placeholder="-"
            />
          </td>
          <td>
            <button type="button" class="btn btn-danger remove-medicine">
              <i class="bi bi-trash"></i> Delete
            </button>
          </td>
        </tr>
      `;
    return newRowHtml;
  },
  getPatientInstructionRow() {
    const newRowHtml = `
           <tr class="patient-instruction-row">
          <td>
            <input
              type="text"
              class="form-control patient-instruction-input"
              placeholder="Enter Medicine"
              list="patient-instructionSuggestions"
              required
            />

            <!-- Suggestions -->
            <datalist id="patient-instructionSuggestions"> </datalist>
          </td>
          <td>
            <input
              type="text"
              class="form-control"
              id="correctwayText"
              placeholder="Enter Correct Way"
              required
            />
          </td>
          <td>
            <input
              type="text"
              class="form-control"
              id="incorrectwayText"
              placeholder="Enter In Correct Way"
              required
            />
          </td>
          <td>
            <button
              type="button"
              class="btn btn-danger remove-patient-instruction"
            >
              <i class="bi bi-trash"></i> Delete
            </button>
          </td>
        </tr>
      `;
    return newRowHtml;
  },
  savePageNumber(tableId, pageNumber) {
    localStorage.setItem("tableId", tableId);
    localStorage.setItem("lastSelectedPage", pageNumber);
  },
  getAndDeletePageNumber() {
    var tableId = localStorage.getItem("tableId");
    var lastSelectedPage = localStorage.getItem("lastSelectedPage");
    localStorage.removeItem("lastSelectedPage");
    return { tableId, lastSelectedPage };
  },
  refreshTablePaging() {
    var lastSelectedPage = common.getAndDeletePageNumber();
    if (lastSelectedPage) {
      const tableReloaded = $("#" + lastSelectedPage.tableId).DataTable();
      tableReloaded.page(Number(lastSelectedPage.lastSelectedPage)).draw(false);
    }
  },

  /*settings*/
  saveSettings(settings) {
    localStorage.removeItem("settings");
    if (settings) localStorage.setItem("settings", JSON.stringify(settings));
  },
  getSettings() {
    return JSON.parse(localStorage.getItem("settings"));
  },
  async refreshSettings() {
    const settings = await window.electronAPI.getSettings();
    this.saveSettings(settings);
  },

  /*translation*/
  saveTranslations(translation) {
    localStorage.removeItem("translation");
    if (translation)
      localStorage.setItem("translation", JSON.stringify(translation));
  },
  getTranslations() {
    return JSON.parse(localStorage.getItem("translation"));
  },
  async refreshTranslations() {
    const translation = await window.electronAPI.getTranslations();
    this.saveTranslations(translation);
  },
  applyBehaviours() {
    $(document).on(
      "input",
      "input:not([type='password'], [type='email']), textarea",
      function () {
        let value = $(this).val();
        let capitalizedValue = value.replace(/\b\w/g, (char) =>
          char.toUpperCase()
        ); // Capitalize first letter of each word
        $(this).val(capitalizedValue);
      }
    );
    $(document).on("keydown", "input, textarea", function (e) {
      let inputs = $("input, textarea"); // Get all input fields & textareas
      let index = inputs.index(this); // Get current field index

      if (e.key === "PageDown") {
        e.preventDefault();
        if (index < inputs.length - 1) {
          inputs.eq(index + 1).focus();
        }
      } else if (e.key === "PageUp") {
        e.preventDefault();
        if (index > 0) {
          inputs.eq(index - 1).focus();
        }
      }
    });
  },
};
module.exports = common;
