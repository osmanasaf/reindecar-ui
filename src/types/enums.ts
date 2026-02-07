
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


export enum PaymentMethod {
    CASH = 'CASH',
    CREDIT_CARD = 'CREDIT_CARD',
    DEBIT_CARD = 'DEBIT_CARD',
    BANK_TRANSFER = 'BANK_TRANSFER',
    ONLINE = 'ONLINE'
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED'
}


export enum Role {
    ADMIN = 'ADMIN',
    OPERATOR = 'OPERATOR'
}


export enum NotificationPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}


export enum FuelLevel {
    EMPTY = 'EMPTY',
    QUARTER = 'QUARTER',
    HALF = 'HALF',
    THREE_QUARTERS = 'THREE_QUARTERS',
    FULL = 'FULL'
}


export enum InvoiceStatus {
    DRAFT = 'DRAFT',
    SENT = 'SENT',
    PAID = 'PAID',
    OVERDUE = 'OVERDUE',
    CANCELLED = 'CANCELLED'
}


export enum KmRecordSource {
    MANUAL = 'MANUAL',
    GPS = 'GPS',
    SERVICE = 'SERVICE'
}


export enum DiscountType {
    PERCENTAGE = 'PERCENTAGE',
    FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export enum CalculationType {
    FIXED = 'FIXED',
    PERCENTAGE = 'PERCENTAGE',
    PER_MONTH = 'PER_MONTH'
}


export enum DamageLocation {
    FRONT_BUMPER = 'FRONT_BUMPER',
    REAR_BUMPER = 'REAR_BUMPER',
    HOOD = 'HOOD',
    TRUNK = 'TRUNK',
    ROOF = 'ROOF',
    FRONT_LEFT_FENDER = 'FRONT_LEFT_FENDER',
    FRONT_RIGHT_FENDER = 'FRONT_RIGHT_FENDER',
    REAR_LEFT_FENDER = 'REAR_LEFT_FENDER',
    REAR_RIGHT_FENDER = 'REAR_RIGHT_FENDER',
    LEFT_FRONT_DOOR = 'LEFT_FRONT_DOOR',
    LEFT_REAR_DOOR = 'LEFT_REAR_DOOR',
    RIGHT_FRONT_DOOR = 'RIGHT_FRONT_DOOR',
    RIGHT_REAR_DOOR = 'RIGHT_REAR_DOOR',
    WINDSHIELD = 'WINDSHIELD',
    REAR_WINDOW = 'REAR_WINDOW',
    LEFT_MIRROR = 'LEFT_MIRROR',
    RIGHT_MIRROR = 'RIGHT_MIRROR',
    INTERIOR = 'INTERIOR',
    WHEEL_FRONT_LEFT = 'WHEEL_FRONT_LEFT',
    WHEEL_FRONT_RIGHT = 'WHEEL_FRONT_RIGHT',
    WHEEL_REAR_LEFT = 'WHEEL_REAR_LEFT',
    WHEEL_REAR_RIGHT = 'WHEEL_REAR_RIGHT'
}

export enum DamageSeverity {
    MINOR = 'MINOR',
    MODERATE = 'MODERATE',
    MAJOR = 'MAJOR',
    CRITICAL = 'CRITICAL'
}

export enum DamageType {
    SCRATCH = 'SCRATCH',
    DENT = 'DENT',
    CRACK = 'CRACK',
    BROKEN_GLASS = 'BROKEN_GLASS',
    TIRE_DAMAGE = 'TIRE_DAMAGE',
    INTERIOR_DAMAGE = 'INTERIOR_DAMAGE',
    ENGINE_DAMAGE = 'ENGINE_DAMAGE',
    ELECTRICAL = 'ELECTRICAL',
    ACCIDENT = 'ACCIDENT',
    OTHER = 'OTHER'
}

export enum MaintenanceType {
    REPAIR = 'REPAIR',
    PAINT = 'PAINT',
    PART_REPLACEMENT = 'PART_REPLACEMENT',
    SERVICE = 'SERVICE',
    INSPECTION = 'INSPECTION',
    TIRE_CHANGE = 'TIRE_CHANGE',
    OIL_CHANGE = 'OIL_CHANGE',
    FILTER_CHANGE = 'FILTER_CHANGE',
    BRAKE_SERVICE = 'BRAKE_SERVICE',
    ELECTRICAL_REPAIR = 'ELECTRICAL_REPAIR',
    BODY_WORK = 'BODY_WORK',
    OTHER = 'OTHER'
}


export enum ViolationType {
    SPEED = 'SPEED',
    RED_LIGHT = 'RED_LIGHT',
    PARKING = 'PARKING',
    SEAT_BELT = 'SEAT_BELT',
    PHONE_USAGE = 'PHONE_USAGE',
    HGS_OGS = 'HGS_OGS',
    BRIDGE_TOLL = 'BRIDGE_TOLL',
    HIGHWAY_TOLL = 'HIGHWAY_TOLL',
    OTHER = 'OTHER'
}

export enum PenaltyStatus {
    PENDING = 'PENDING',
    NOTIFIED = 'NOTIFIED',
    DISPUTED = 'DISPUTED',
    PAID_BY_CUSTOMER = 'PAID_BY_CUSTOMER',
    PAID_BY_COMPANY = 'PAID_BY_COMPANY',
    CANCELLED = 'CANCELLED',
    WRITTEN_OFF = 'WRITTEN_OFF'
}

export enum PenaltySource {
    MANUAL = 'MANUAL',
    EXTERNAL = 'EXTERNAL'
}

export enum InstallmentPaymentStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    OVERDUE = 'OVERDUE'
}
