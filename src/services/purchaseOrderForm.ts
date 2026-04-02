import apiClient from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Location & Address types
// ---------------------------------------------------------------------------

export interface Address {
  street?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  zip?: string;
  country?: string;
}

export interface Location {
  _id: string;
  name: string;
  gstNumber?: string;
  contactNumber?: string;
  countryCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  address?: Address;
}

// ---------------------------------------------------------------------------
// Vendor company types
// ---------------------------------------------------------------------------

export interface VendorCompany {
  _id: string;
  name: string;
  contactNumber?: string;
  phoneNumber?: string;
  countryCode?: string;
  taxNumber?: string;
  status: "active" | "inactive";
  locations: Location[];
}

export interface VendorCompaniesResponse {
  vendorCompanies: VendorCompany[];
}

// ---------------------------------------------------------------------------
// Organization types
// ---------------------------------------------------------------------------

export interface Organization {
  _id: string;
  name: string;
  contactNumber?: string;
  phoneNumber?: string;
  countryCode?: string;
  taxNumber?: string;
  locations: Location[];
}

// ---------------------------------------------------------------------------
// Organization settings types (re-exported subset for form use)
// ---------------------------------------------------------------------------

export interface POFormSettings {
  paymentTerms: string[];
  soPaymentTerms: string[];
  generatePOAutomatically: boolean;
  poPrefix: string;
  poSeparator: string;
  nextPONumber: number;
  generateSOAutomatically: boolean;
  soPrefix: string;
  soSeparator: string;
  nextSONumber: number;
}

// ---------------------------------------------------------------------------
// Product search types
// ---------------------------------------------------------------------------

export interface ProductVariant {
  _id: string;
  name: string;
}

export interface ProductSearchResult {
  _id: string;
  name: string;
  unitOfMeasurement: string;
  gst: number;
  variants: ProductVariant[];
}

export interface ProductSearchResponse {
  products: ProductSearchResult[];
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Partner object for POST body
// ---------------------------------------------------------------------------

export interface PartnerAddressPayload {
  _id: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  gstNumber?: string;
}

export interface PartnerPayload {
  id: string;
  name: string;
  taxNumber?: string;
  contactNumber: string;
  address: PartnerAddressPayload;
}

// ---------------------------------------------------------------------------
// Product line for POST body
// ---------------------------------------------------------------------------

export interface ProductLinePayload {
  product: { _id: string; value: string };
  variant: { _id: string; value: string };
  quantity: { value: number; postfix: string };
  price: { value: number; prefix: string; suffix: string };
  gst: { value: number; postfix: string };
  discount: { value: number };
}

// ---------------------------------------------------------------------------
// Create PO payload
// ---------------------------------------------------------------------------

export interface CreatePOPayload {
  supplier: PartnerPayload;
  buyer: PartnerPayload;
  biller: PartnerPayload;
  referenceId: string;
  supplierReferenceId: string;
  issueDate: string;
  deliveryDate: string;
  paymentTerms: string;
  termsAndConditions: string[];
  notes: string;
  products: ProductLinePayload[];
  orderType: "purchase" | "sales";
  status: "issued" | "draft";
  poNumber: string;
  files: any[];
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getVendorCompaniesWithLocations(): Promise<VendorCompany[]> {
  const { data } = await apiClient.get<VendorCompaniesResponse>(
    "/vendor-companies/with-locations"
  );
  return data.vendorCompanies;
}

export async function getMyOrganization(): Promise<Organization> {
  const { data } = await apiClient.get<Organization>("/organizations/my-own");
  return data;
}

export async function getPOFormSettings(): Promise<POFormSettings> {
  const { data } = await apiClient.get<POFormSettings>(
    "/organization-settings/my-own"
  );
  return {
    paymentTerms: data.paymentTerms,
    soPaymentTerms: data.soPaymentTerms,
    generatePOAutomatically: data.generatePOAutomatically,
    poPrefix: data.poPrefix,
    poSeparator: data.poSeparator,
    nextPONumber: data.nextPONumber,
    generateSOAutomatically: data.generateSOAutomatically,
    soPrefix: data.soPrefix,
    soSeparator: data.soSeparator,
    nextSONumber: data.nextSONumber,
  };
}

export async function searchProducts(
  searchTerm: string
): Promise<ProductSearchResult[]> {
  if (!searchTerm.trim()) return [];
  const { data } = await apiClient.get<ProductSearchResponse>("/products", {
    params: { name: searchTerm },
  });
  return data.products;
}

export async function createPurchaseOrder(
  payload: CreatePOPayload
): Promise<any> {
  const { data } = await apiClient.post("/purchase-orders", payload);
  return data;
}

export async function updatePurchaseOrder(
  id: string,
  payload: CreatePOPayload
): Promise<any> {
  const { data } = await apiClient.put(`/purchase-orders/${id}`, payload);
  return data;
}

export async function getOrderForEdit(id: string): Promise<any> {
  const { data } = await apiClient.get(`/purchase-orders/${id}?comprehensive=true`);
  return data;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function buildPartnerPayload(
  company: VendorCompany | Organization,
  location: Location
): PartnerPayload {
  return {
    id: company._id,
    name: company.name,
    ...(company.taxNumber ? { taxNumber: company.taxNumber } : {}),
    contactNumber: company.phoneNumber ?? company.contactNumber ?? location.contactNumber ?? "",
    address: {
      _id: location._id,
      addressLine1: location.addressLine1,
      addressLine2: location.addressLine2,
      city: location.city,
      state: location.state,
      country: location.country,
      postalCode: location.zip,
      gstNumber: location.gstNumber,
    },
  };
}

export function buildProductLine(
  product: ProductSearchResult,
  variant: ProductVariant,
  quantity: number,
  uom: string,
  price: number,
  gst: number,
  discount: number = 0
): ProductLinePayload {
  return {
    product: { _id: product._id, value: product.name },
    variant: { _id: variant._id, value: variant.name },
    quantity: { value: quantity, postfix: uom },
    price: { value: price, prefix: "₹", suffix: "per unit" },
    gst: { value: gst, postfix: "%" },
    discount: { value: discount },
  };
}

export function calculateLineTotal(
  quantity: number,
  price: number,
  gst: number,
  discount: number = 0
): number {
  const subtotal = quantity * price;
  const discountedSubtotal = subtotal - (subtotal * discount) / 100;
  const total = discountedSubtotal + (discountedSubtotal * gst) / 100;
  return Math.round(total * 100) / 100;
}
