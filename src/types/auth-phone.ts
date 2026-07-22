export type OtpDeliveryChannel = "sms" | "whatsapp";

export type OtpPurpose = "login" | "signup" | "2fa" | "password_reset";

export interface CountryOption {
  iso2: string;
  dialCode: string;
  nameEn: string;
  nameAr: string;
  nationalMinLength: number;
  nationalMaxLength: number;
}

export interface NormalizedPhone {
  e164: string;
  countryIso2: string;
  dialCode: string;
  nationalNumber: string;
}

export interface PhoneInputValue {
  nationalNumber: string;
  countryIso2: string;
  e164: string | null;
  isValid: boolean;
}
