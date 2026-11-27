import { apiFetch } from "@/lib/api/client";
import type {
  CreateAddressPayload,
  UpdateAddressPayload,
  UserAddress,
} from "@/types/address.types";

interface AddressesResponse {
  message: string;
  data: UserAddress[];
}

export async function getAddresses(): Promise<UserAddress[]> {
  const res = await apiFetch<AddressesResponse>("/users/me/addresses", {
    method: "GET",
    cache: "no-store",
  });
  return res.data ?? [];
}

export async function createAddress(
  payload: CreateAddressPayload,
): Promise<UserAddress[]> {
  const res = await apiFetch<AddressesResponse>("/users/me/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data ?? [];
}

export async function updateAddress(
  addressId: string,
  payload: UpdateAddressPayload,
): Promise<UserAddress[]> {
  const res = await apiFetch<AddressesResponse>(
    `/users/me/addresses/${encodeURIComponent(addressId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return res.data ?? [];
}

export async function setDefaultAddress(
  addressId: string,
): Promise<UserAddress[]> {
  const res = await apiFetch<AddressesResponse>(
    `/users/me/addresses/${encodeURIComponent(addressId)}/default`,
    {
      method: "PATCH",
      body: JSON.stringify({}),
    },
  );
  return res.data ?? [];
}

export async function deleteAddress(addressId: string): Promise<UserAddress[]> {
  const res = await apiFetch<AddressesResponse>(
    `/users/me/addresses/${encodeURIComponent(addressId)}`,
    {
      method: "DELETE",
    },
  );
  return res.data ?? [];
}
