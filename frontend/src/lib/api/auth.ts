import apiClient from "./client";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface MeResponse {
  id: string;
  name: string;
  role: "retailer" | "distributor";
  profile_id?: string;
  profile_complete: boolean;
}

export const authApi = {
  // Uses OAuth2 password flow format as required by FastAPI
  login: async (mobile: string, password: string): Promise<TokenResponse> => {
    const formData = new URLSearchParams();
    formData.append("username", mobile);
    formData.append("password", password);

    const { data } = await apiClient.post<TokenResponse>(
      "/auth/login",
      formData,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    return data;
  },

  getMe: async (): Promise<MeResponse> => {
    const { data } = await apiClient.get<MeResponse>("/auth/me");
    return data;
  },
};
