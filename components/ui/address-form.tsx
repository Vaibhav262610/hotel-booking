import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AddressData {
  street_address: string;
  city: string;
  postal_code: string;
  state: string;
  country: string;
}

interface AddressFormProps {
  address: AddressData | string | null;
  onChange: (address: AddressData) => void;
  showLabels?: boolean;
  isRequired?: boolean;
}

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "PUDUCHERRY"
];

export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", 
  "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", 
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", 
  "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", 
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", 
  "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", 
  "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", 
  "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", 
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", 
  "Eritrea", "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon", 
  "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", 
  "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", 
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", 
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", 
  "Korea, North", "Korea, South", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", 
  "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", 
  "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", 
  "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", 
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", 
  "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", 
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "Norway", "Oman", 
  "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", 
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", 
  "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent", 
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", 
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", 
  "Solomon Islands", "Somalia", "South Africa", "Spain", "Sri Lanka", 
  "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland", "Syria", 
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", 
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", 
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", 
  "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", 
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

/**
 * A reusable address form component that handles structured address format
 */
export const AddressForm = ({
  address,
  onChange,
  showLabels = true,
  isRequired = false,
}: AddressFormProps) => {
  // Initialize address form data based on input prop
  const [addressData, setAddressData] = useState<AddressData>(() => {
    if (typeof address === 'object' && address !== null) {
      return address;
    } else {
      return {
        street_address: typeof address === 'string' ? address : '',
        city: "PUDUCHERRY",
        postal_code: "605003",
        state: "Tamil Nadu",
        country: "India",
      };
    }
  });

  // Handle field change and propagate up to parent
  const handleChange = (field: keyof AddressData, value: string) => {
    const updatedAddress = {
      ...addressData,
      [field]: value,
    };
    setAddressData(updatedAddress);
    onChange(updatedAddress);
  };

  return (
    <div className="space-y-4">
      {/* Street Address */}
      <div className="space-y-2">
        {showLabels && (
          <Label htmlFor="street_address">
            Street Address {isRequired && <span className="text-destructive">*</span>}
          </Label>
        )}
        <Textarea
          id="street_address"
          placeholder="Street Address"
          value={addressData.street_address}
          onChange={(e) => handleChange("street_address", e.target.value)}
          required={isRequired}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* City */}
        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="city">
              City {isRequired && <span className="text-destructive">*</span>}
            </Label>
          )}
          <Input
            id="city"
            placeholder="City"
            value={addressData.city}
            onChange={(e) => handleChange("city", e.target.value)}
            required={isRequired}
          />
        </div>

        {/* Postal Code */}
        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="postal_code">
              Postal Code {isRequired && <span className="text-destructive">*</span>}
            </Label>
          )}
          <Input
            id="postal_code"
            placeholder="Postal Code"
            value={addressData.postal_code}
            onChange={(e) => handleChange("postal_code", e.target.value)}
            required={isRequired}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* State */}
        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="state">
              State {isRequired && <span className="text-destructive">*</span>}
            </Label>
          )}
          <Select
            value={addressData.state}
            onValueChange={(value) => handleChange("state", value)}
          >
            <SelectTrigger id="state">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Country */}
        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="country">
              Country {isRequired && <span className="text-destructive">*</span>}
            </Label>
          )}
          <Select
            value={addressData.country}
            onValueChange={(value) => handleChange("country", value)}
          >
            <SelectTrigger id="country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

/**
 * A helper function to display an address in a formatted way
 */
export const formatAddress = (address: AddressData | string | null | undefined): string => {
  if (!address) return "N/A";
  
  if (typeof address === 'string') {
    return address;
  }
  
  const parts = [
    address.street_address,
    address.city,
    address.postal_code,
    address.state,
    address.country
  ].filter(Boolean);
  
  return parts.join(', ');
};

/**
 * A helper function to create a compact address display
 */
export const formatAddressCompact = (address: AddressData | string | null | undefined): string => {
  if (!address) return "N/A";
  
  if (typeof address === 'string') {
    return address;
  }
  
  return `${address.street_address || ''}, ${address.city || ''} - ${address.postal_code || ''}`;
};

/**
 * A helper function to normalize address to the structured format
 */
export const normalizeAddress = (address: AddressData | string | null | undefined): AddressData => {
  if (typeof address === 'object' && address !== null && 'street_address' in address) {
    return address;
  }
  
  const streetAddress = typeof address === 'string' ? address : '';
  
  return {
    street_address: streetAddress,
    city: "PUDUCHERRY",
    postal_code: "605003",
    state: "Tamil Nadu",
    country: "India"
  };
};
