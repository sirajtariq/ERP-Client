import api from "./api";

// GET /users/?page=1&page_size=10&search=
export const getAllUsers = async ({ page = 1, pageSize = 10, search = "" } = {}) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("page_size", pageSize);
  if (search) params.append("search", search);

  const response = await api.get(`/users/?${params.toString()}`);
  return response.data;
  // Response: { count, total_pages, page, page_size, next, previous, results: [...] }
};

export const createUser = async (payload) => {
  const response = await api.post("/users/", payload);
  return response.data;
};

export const updateUser = async (id, payload) => {
  const response = await api.put(`/users/${id}/`, payload);
  return response.data;
};

export const deleteUser = async (id) => {
  await api.delete(`/users/${id}/`);
};

export const normalizeUser = (user) => {
  const profile = user.profile || {};
  return {
    id:             user.id,
    username:       user.username       || "",
    email:          user.email          || "",
    role:           user.role           || "",
    isActive:       user.isActive       ?? true,
    dateJoined:     user.dateJoined     || "",
    fullname:       profile.fullname       || "",
    phone:          profile.phone          || "",
    cnic:           profile.cnic           || "",
    address:        profile.address        || "",
    designation:    profile.designation    || "",
    dateofjoining:  profile.dateofjoining  || "",
    employmenttype: profile.employmenttype || "",
    basicsalary:    profile.basicsalary    ? parseFloat(profile.basicsalary) : null,
    salarytype:     profile.salarytype     || "",
  };
};
