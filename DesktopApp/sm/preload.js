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
  addDiagnosis: (name) => ipcRenderer.invoke("add-diagnosis", name),
  updateDiagnosis: (id, name) =>
    ipcRenderer.invoke("update-diagnosis", id, name),
  deleteDiagnosisById: (id) => ipcRenderer.invoke("delete-diagnosis-by-id", id),
  getAttachMedicineByDiagnosisIds: (diagnosisIds) =>
    ipcRenderer.invoke("get-attach-medicine-by-diagnosisIds", diagnosisIds),
  attachMedicine: (id, medicines) =>
    ipcRenderer.invoke("attach-medicine", id, medicines),
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
  addInvestigation: (name) => ipcRenderer.invoke("add-investigation", name),
  updateInvestigation: (id, name) =>
    ipcRenderer.invoke("update-investigation", id, name),
  deleteInvestigationById: (id) =>
    ipcRenderer.invoke("delete-investigation-by-id", id),

  getSettings: () => ipcRenderer.invoke("get-settings"),
  getTranslations: () => ipcRenderer.invoke("get-translations"),

  updateSettings: (
    defaultdate,
    defaultday,
    defaultcomplaintunit,
    defaultcomplaintduration
  ) =>
    ipcRenderer.invoke(
      "update-settings",
      defaultdate,
      defaultday,
      defaultcomplaintunit,
      defaultcomplaintduration
    ),
  savetranslations: (translations) =>
    ipcRenderer.invoke("save-translations", translations),

  print: (htmlContent) => ipcRenderer.send("print-content", htmlContent),
});
