import api from "./api";

export const getBackupSettings = async () => {
  const res = await api.get("/settings/backup/");
  return res.data;
};

export const updateBackupSettings = async (payload) => {
  const res = await api.put("/settings/backup/", payload);
  return res.data;
};

export const triggerBackup = async () => {
  const res = await api.post("/settings/backup/trigger/");
  return res.data;
};

export const restoreDatabase = async (file) => {
  const formData = new FormData();
  formData.append("backup_file", file);
  const res = await api.post("/settings/backup/restore/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
