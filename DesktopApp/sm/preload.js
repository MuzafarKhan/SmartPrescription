const { contextBridge, ipcRenderer } = require("electron");

// Expose functions to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  getChiefComplaint: () => ipcRenderer.invoke("get-chief-complaint"),
  getChiefComplaintByName: (name) =>
    ipcRenderer.invoke("get-chief-complaint-by-name", name),
  getChiefComplaintById: (id) =>
    ipcRenderer.invoke("get-chief-complaint-by-id", id),
  addChiefComplaint: (complaint) =>
    ipcRenderer.invoke("add-chief-complaint", complaint),
  updateChiefComplaint: (id, complaint) =>
    ipcRenderer.invoke("update-chief-complaint", id, complaint),
  deleteChiefComplaintById: (id) =>
    ipcRenderer.invoke("delete-chief-complaint-by-id", id),

  getMedicine: () => ipcRenderer.invoke("get-medicine"),
  getMedicineByName: (name) => ipcRenderer.invoke("get-medicine-by-name", name),
  getMedicineById: (id) => ipcRenderer.invoke("get-medicine-by-id", id),
  addMedicine: (medicine) => ipcRenderer.invoke("add-medicine", medicine),
  updateMedicineById: (id, medicine) =>
    ipcRenderer.invoke("update-medicine-by-id", id, medicine),
  deleteMedicineById: (id) => ipcRenderer.invoke("delete-medicine-by-id", id),

  getRehabilitationAids: () => ipcRenderer.invoke("get-rehabilitation-aids"),
  getRehabilitationAidsByName: (name) =>
    ipcRenderer.invoke("get-rehabilitation-aids-by-name", name),
  getRehabilitationAidsById: (id) =>
    ipcRenderer.invoke("get-rehabilitation-aids-by-id", id),
  addRehabilitationAids: (name, moredetail) =>
    ipcRenderer.invoke("add-rehabilitation-aids", name, moredetail),
  updateRehabilitationAids: (id, name, moredetail) =>
    ipcRenderer.invoke("update-rehabilitation-aids", id, name, moredetail),
  deleteRehabilitationAidsById: (id) =>
    ipcRenderer.invoke("delete-rehabilitation-aids-by-id", id),

  getPatientInstruction: () => ipcRenderer.invoke("get-patient-instruction"),
  getPatientInstructionByName: (name) =>
    ipcRenderer.invoke("get-patient-instruction-by-name", name),
  getPatientInstructionById: (id) =>
    ipcRenderer.invoke("get-patient-instruction-by-id", id),
  addPatientInstruction: (title, detail) =>
    ipcRenderer.invoke("add-patient-instruction", title, detail),
  updatePatientInstruction: (id, title, detail) =>
    ipcRenderer.invoke("update-patient-instruction", id, title, detail),
  deletePatientInstructionById: (id) =>
    ipcRenderer.invoke("delete-patient-instruction-by-id", id),

  getPlan: () => ipcRenderer.invoke("get-plan"),
  getPlanByName: (name) => ipcRenderer.invoke("get-plan-by-name", name),
  getPlanById: (id) => ipcRenderer.invoke("get-plan-by-id", id),
  addPlan: (name) => ipcRenderer.invoke("add-plan", name),
  updatePlan: (id, name) => ipcRenderer.invoke("update-plan", id, name),
  deletePlanById: (id) => ipcRenderer.invoke("delete-plan-by-id", id),

  getDiagnosis: () => ipcRenderer.invoke("get-diagnosis"),
  getDiagnosisByName: (name) =>
    ipcRenderer.invoke("get-diagnosis-by-name", name),
  getDiagnosisById: (id) => ipcRenderer.invoke("get-diagnosis-by-id", id),
  addDiagnosis: (name, nameAlter) =>
    ipcRenderer.invoke("add-diagnosis", name, nameAlter),
  updateDiagnosis: (id, name, nameAlter) =>
    ipcRenderer.invoke("update-diagnosis", id, name, nameAlter),
  deleteDiagnosisById: (id) => ipcRenderer.invoke("delete-diagnosis-by-id", id),

  getCreateTemplateByDiagnosisIds: (diagnosisIds) =>
    ipcRenderer.invoke("get-create-medicine-by-diagnosisIds", diagnosisIds),

  attachMedicine: (id, medicines) =>
    ipcRenderer.invoke("attach-medicine", id, medicines),
  createTemplate: (id, templateData) =>
    ipcRenderer.invoke("create-Template", id, templateData),
  getAttachPatientInstructionByDiagnosisIds: (diagnosisIds) =>
    ipcRenderer.invoke(
      "get-attach-patient-instruction-by-diagnosisIds",
      diagnosisIds
    ),
  attachPatientInstruction: (id, patientinstructions) =>
    ipcRenderer.invoke("attach-patient-instruction", id, patientinstructions),

  getInvestigation: () => ipcRenderer.invoke("get-investigation"),
  getInvestigationByName: (name) =>
    ipcRenderer.invoke("get-investigation-by-name", name),
  getInvestigationById: (id) =>
    ipcRenderer.invoke("get-investigation-by-id", id),
  addInvestigation: (name, isPrintableOnPrescription) =>
    ipcRenderer.invoke("add-investigation", name, isPrintableOnPrescription),
  updateInvestigation: (id, name, isPrintableOnPrescription) =>
    ipcRenderer.invoke(
      "update-investigation",
      id,
      name,
      isPrintableOnPrescription
    ),
  deleteInvestigationById: (id) =>
    ipcRenderer.invoke("delete-investigation-by-id", id),

  getSettings: () => ipcRenderer.invoke("get-settings"),
  getTranslations: () => ipcRenderer.invoke("get-translations"),

  updateSettings: (
    defaultdate,
    defaultday,
    defaultcomplaintunit,
    defaultcomplaintduration,
    defaultfollowupunit,
    defaultfollowupduration,
    investigationDetailValues,
    surgeryDetailValues,
    defaultPrescriptionPrinterName,
    defaultThermalPrinterName,
    alwaysAskCredentials,
    appZoomLevel
  ) =>
    ipcRenderer.invoke(
      "update-settings",
      defaultdate,
      defaultday,
      defaultcomplaintunit,
      defaultcomplaintduration,
      defaultfollowupunit,
      defaultfollowupduration,
      investigationDetailValues,
      surgeryDetailValues,
      defaultPrescriptionPrinterName,
      defaultThermalPrinterName,
      alwaysAskCredentials,
      appZoomLevel
    ),
  setAppZoom: (appZoomLevel) =>
    ipcRenderer.invoke("set-app-zoom", appZoomLevel),
  savetranslations: (translations) =>
    ipcRenderer.invoke("save-translations", translations),

  print: (htmlContent) => ipcRenderer.send("print-content", htmlContent),
  printDirect: (options) => ipcRenderer.invoke("print-direct", options),

  login: (username, password) => ipcRenderer.invoke("login", username, password),

  savePendingPatient: (prescriptionData) =>
    ipcRenderer.invoke("save-pending-patient", prescriptionData),
  getPendingPatients: (options) =>
    ipcRenderer.invoke("get-pending-patients", options),
  getPendingPatientById: (prescriptionUniqueId) =>
    ipcRenderer.invoke("get-pending-patient-by-id", prescriptionUniqueId),
  deletePendingPatient: (prescriptionUniqueId) =>
    ipcRenderer.invoke("delete-pending-patient", prescriptionUniqueId),
  clearPendingPatients: () => ipcRenderer.invoke("clear-pending-patients"),
  getPendingPatientCount: () => ipcRenderer.invoke("get-pending-patient-count"),

  allocateMrNumber: () => ipcRenderer.invoke("peek-next-mr-number"),
  peekNextMrNumber: () => ipcRenderer.invoke("peek-next-mr-number"),
  completePrescription: (prescriptionData) =>
    ipcRenderer.invoke("complete-prescription", prescriptionData),
  getPatientHistory: (options) => ipcRenderer.invoke("get-patient-history", options),
  getPatientVisits: (mrNumber) => ipcRenderer.invoke("get-patient-visits", mrNumber),
  getPatientVisitById: (visitId) => ipcRenderer.invoke("get-patient-visit-by-id", visitId),

  getDatabaseFreeSpace: () => ipcRenderer.invoke("get-database-free-space"),
  compactDatabase: () => ipcRenderer.invoke("compact-database"),
});
