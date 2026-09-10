const ACCESS_KEY = "apartment_access_verified";
const ROOMMATE_KEY = "roommate_id";

export function hasApartmentAccess(): boolean {
  return localStorage.getItem(ACCESS_KEY) === "true";
}

export function setApartmentAccess(value: boolean) {
  if (value) localStorage.setItem(ACCESS_KEY, "true");
  else localStorage.removeItem(ACCESS_KEY);
}

export function getStoredRoommateId(): string | null {
  return localStorage.getItem(ROOMMATE_KEY);
}

export function setStoredRoommateId(id: string | null) {
  if (id) localStorage.setItem(ROOMMATE_KEY, id);
  else localStorage.removeItem(ROOMMATE_KEY);
}
