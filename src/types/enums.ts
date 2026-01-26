// Customer Types
export enum CustomerType {
    PERSONAL = 'PERSONAL',
    COMPANY = 'COMPANY'
}

export enum CustomerStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    BLACKLISTED = 'BLACKLISTED'
}

export enum CreditRating {
    EXCELLENT = 'EXCELLENT',
    GOOD = 'GOOD',
    FAIR = 'FAIR',
    POOR = 'POOR',
    BAD = 'BAD'
}

// Vehicle Types
export enum VehicleStatus {
    AVAILABLE = 'AVAILABLE',
    RESERVED = 'RESERVED',
    RENTED = 'RENTED',
    MAINTENANCE = 'MAINTENANCE',
    DAMAGED = 'DAMAGED',
    INACTIVE = 'INACTIVE',
    SOLD = 'SOLD'
}

export enum FuelType {
    GASOLINE = 'GASOLINE',
    DIESEL = 'DIESEL',
    ELECTRIC = 'ELECTRIC',
    HYBRID = 'HYBRID',
    LPG = 'LPG'
}

export enum Transmission {
    MANUAL = 'MANUAL',
    AUTOMATIC = 'AUTOMATIC'
}

// Rental Types
export enum RentalStatus {
    DRAFT = 'DRAFT',
    RESERVED = 'RESERVED',
    ACTIVE = 'ACTIVE',
    RETURN_PENDING = 'RETURN_PENDING',
    CLOSED = 'CLOSED',
    CANCELLED = 'CANCELLED',
    OVERDUE = 'OVERDUE'
}

export enum RentalType {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    LEASING = 'LEASING'
}

// Payment Types
export enum PaymentMethod {
    CASH = 'CASH',
    CREDIT_CARD = 'CREDIT_CARD',
    DEBIT_CARD = 'DEBIT_CARD',
    BANK_TRANSFER = 'BANK_TRANSFER'
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED'
}

// User Types
export enum Role {
    ADMIN = 'ADMIN',
    OPERATOR = 'OPERATOR'
}

// Notification Types
export enum NotificationPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

// Fuel Level
export enum FuelLevel {
    EMPTY = 'EMPTY',
    QUARTER = 'QUARTER',
    HALF = 'HALF',
    THREE_QUARTERS = 'THREE_QUARTERS',
    FULL = 'FULL'
}

// Invoice Status
export enum InvoiceStatus {
    DRAFT = 'DRAFT',
    SENT = 'SENT',
    PAID = 'PAID',
    OVERDUE = 'OVERDUE',
    CANCELLED = 'CANCELLED'
}

// KM Record Source
export enum KmRecordSource {
    MANUAL = 'MANUAL',
    GPS = 'GPS',
    SERVICE = 'SERVICE'
}
