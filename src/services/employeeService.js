import api from "./api";

export const getAllEmployees = async ({ page = 1, pageSize = 10, search = "", status = "", department = "" } = {}) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("page_size", pageSize);
  if (search) params.append("search", search);
  if (status && status !== "all") params.append("status", status);
  if (department) params.append("department", department);
  const response = await api.get(`/employees/?${params.toString()}`);
  return response.data;
};

export const getEmployee = async (id) => {
  const response = await api.get(`/employees/${id}/`);
  return response.data;
};

export const createEmployee = async (payload) => {
  const response = await api.post("/employees/", payload);
  return response.data;
};

export const updateEmployee = async (id, payload) => {
  const response = await api.put(`/employees/${id}/`, payload);
  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await api.delete(`/employees/${id}/`);
  return response.data;
};

export const createEmployeeAdvance = async (id, payload) => {
  const response = await api.post(`/employees/${id}/advances/`, payload);
  return response.data;
};

export const createEmployeeIncrement = async (id, payload) => {
  const response = await api.post(`/employees/${id}/increments/`, payload);
  return response.data;
};

export const createEmployeeSalary = async (id, payload) => {
  const response = await api.post(`/employees/${id}/salaries/`, payload);
  return response.data;
};

export const getEmployeeSalariesTab = async (id, page = 1) => {
  const response = await api.get(`/employees/${id}/salaries-tab/?page=${page}&page_size=10`);
  return response.data;
};

export const getEmployeeIncrementsTab = async (id, page = 1) => {
  const response = await api.get(`/employees/${id}/increments-tab/?page=${page}&page_size=10`);
  return response.data;
};

export const getEmployeeAdvancesTab = async (id, page = 1) => {
  const response = await api.get(`/employees/${id}/advances-tab/?page=${page}&page_size=10`);
  return response.data;
};

export const getEmployeeAttendance = async (employeeId, month, year) => {
  const params = new URLSearchParams({ employeeId, month, year });
  const response = await api.get(`/attendance/?${params.toString()}`);
  return response.data;
};

export const getBulkAttendance = async (date) => {
  const response = await api.get(`/attendance/bulk/?date=${date}`);
  return response.data;
};

export const saveBulkAttendance = async (payload) => {
  const response = await api.post("/attendance/bulk/", payload);
  return response.data;
};

export const updateAttendance = async (id, payload) => {
  const response = await api.put(`/attendance/${id}/`, payload);
  return response.data;
};

export const toggleEmployeeStatus = async (id, body) => {
  const response = await api.post(`/employees/${id}/status/`, body);
  return response.data;
};

export const normalizeEmployee = (emp) => {
  // Detail response: GET /employees/{id}/ — nested shape with header/personalInfo/salaryInfo
  if (emp.header) {
    return {
      id:            emp.header.id,
      empNo:         emp.header.empNo            || emp.personalInfo?.empNo || "",
      name:          emp.header.name             || "",
      designation:   emp.header.designation      || "",
      department:    emp.header.department        || "",
      status:        emp.header.status           || "active",
      joiningDate:   emp.personalInfo?.joiningDate  || "",
      leavingDate:   emp.personalInfo?.leavingDate  || null,
      reJoiningDate: emp.personalInfo?.rejoiningDate || null,
      basicSalary:   parseFloat(emp.salaryInfo?.basicSalary)   || 0,
      currentSalary: parseFloat(emp.salaryInfo?.currentSalary) || 0,
      phone:         emp.personalInfo?.phone   || "",
      email:         emp.personalInfo?.email   || "",
      cnic:          emp.personalInfo?.cnic    || "",
      address:       emp.personalInfo?.address || "",
      advanceBalance: parseFloat(emp.topMetrics?.advanceBalance) || 0,
      tabBadges: emp.tabBadges || { unpaidSalariesCount: 0, incrementsCount: 0, advancesCount: 0, attendanceAlertBadge: "" },
    };
  }

  // List response: GET /employees/ — flat shape with salary nested + lastWorkingDate
  return {
    id:            emp.id,
    empNo:         emp.empId || "",
    name:          emp.name  || "",
    designation:   emp.designation || "",
    department:    emp.department  || "",
    status:        emp.status      || "active",
    joiningDate:   emp.joiningDate || "",
    leavingDate:   emp.lastWorkingDate || emp.leavingDate || null,
    reJoiningDate: emp.rejoiningDate  || null,
    basicSalary:   parseFloat(emp.salary?.basicSalary   ?? emp.basicSalary)   || 0,
    currentSalary: parseFloat(emp.salary?.currentSalary ?? emp.currentSalary) || 0,
    phone:         emp.phone   || "",
    email:         emp.email   || "",
    cnic:          emp.cnic    || "",
    address:       emp.address || "",
    advanceBalance: parseFloat(emp.advance) || 0,
  };
};
