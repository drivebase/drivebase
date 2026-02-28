const envBaseUrl = import.meta.env.VITE_PUBLIC_BASE_URL;

const normalizedBaseUrl = envBaseUrl?.replace(/\/+$/, "");

export const API_BASE_URL = normalizedBaseUrl || "";
export const GRAPHQL_API_URL = API_BASE_URL
	? `${API_BASE_URL}/graphql`
	: "/graphql";
