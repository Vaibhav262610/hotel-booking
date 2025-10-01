export interface TransferBusinessRules {
  allowSameFloorTransfer: boolean
  allowDifferentRoomType: boolean
  requireGuestConsent: boolean
  requireManagerApproval: boolean
  maxTransfersPerBooking: number
  transferTimeRestrictions: {
    allowedHours: {
      start: number // 24-hour format
      end: number   // 24-hour format
    }
    allowWeekendTransfers: boolean
    allowHolidayTransfers: boolean
  }
  notificationSettings: {
    notifyGuest: boolean
    notifyHousekeeping: boolean
    notifyManagement: boolean
    notifyFrontDesk: boolean
  }
  rateAdjustmentPolicy: {
    allowRateChanges: boolean
    requireApprovalForRateIncrease: boolean
    maxRateIncreasePercentage: number
  }
  roomTypeCompatibility: {
    [roomType: string]: string[] // Allowed room types for transfer
  }
}

export class TransferBusinessRulesService {
  private static readonly DEFAULT_RULES: TransferBusinessRules = {
    allowSameFloorTransfer: true,
    allowDifferentRoomType: true,
    requireGuestConsent: false,
    requireManagerApproval: false,
    maxTransfersPerBooking: 3,
    transferTimeRestrictions: {
      allowedHours: {
        start: 6,  // 6 AM
        end: 22    // 10 PM
      },
      allowWeekendTransfers: true,
      allowHolidayTransfers: true
    },
    notificationSettings: {
      notifyGuest: true,
      notifyHousekeeping: true,
      notifyManagement: false,
      notifyFrontDesk: true
    },
    rateAdjustmentPolicy: {
      allowRateChanges: true,
      requireApprovalForRateIncrease: true,
      maxRateIncreasePercentage: 20
    },
    roomTypeCompatibility: {
      'standard': ['standard', 'deluxe'],
      'deluxe': ['standard', 'deluxe', 'suite'],
      'suite': ['deluxe', 'suite', 'presidential'],
      'presidential': ['suite', 'presidential']
    }
  }

  private static rules: TransferBusinessRules = { ...this.DEFAULT_RULES }

  /**
   * Get current business rules
   */
  static getRules(): TransferBusinessRules {
    return { ...this.rules }
  }

  /**
   * Update business rules
   */
  static updateRules(newRules: Partial<TransferBusinessRules>): void {
    this.rules = { ...this.rules, ...newRules }
  }

  /**
   * Reset to default rules
   */
  static resetToDefaults(): void {
    this.rules = { ...this.DEFAULT_RULES }
  }

  /**
   * Validate transfer against business rules
   */
  static validateTransfer(transferData: {
    fromRoomType: string
    toRoomType: string
    fromFloor: number
    toFloor: number
    transferTime: Date
    bookingId: string
    currentTransferCount: number
    rateChange?: number
  }): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check transfer count limit
    if (transferData.currentTransferCount >= this.rules.maxTransfersPerBooking) {
      errors.push(`Maximum transfers per booking (${this.rules.maxTransfersPerBooking}) exceeded`)
    }

    // Check room type compatibility
    if (!this.rules.allowDifferentRoomType) {
      if (transferData.fromRoomType !== transferData.toRoomType) {
        errors.push('Room type changes are not allowed')
      }
    } else {
      const allowedTypes = this.rules.roomTypeCompatibility[transferData.fromRoomType] || []
      if (!allowedTypes.includes(transferData.toRoomType)) {
        errors.push(`Transfer from ${transferData.fromRoomType} to ${transferData.toRoomType} is not allowed`)
      }
    }

    // Check floor preference
    if (!this.rules.allowSameFloorTransfer && transferData.fromFloor === transferData.toFloor) {
      warnings.push('Same floor transfers are not preferred')
    }

    // Check time restrictions
    const hour = transferData.transferTime.getHours()
    if (hour < this.rules.transferTimeRestrictions.allowedHours.start || 
        hour > this.rules.transferTimeRestrictions.allowedHours.end) {
      errors.push(`Transfers are only allowed between ${this.rules.transferTimeRestrictions.allowedHours.start}:00 and ${this.rules.transferTimeRestrictions.allowedHours.end}:00`)
    }

    // Check weekend restrictions
    const dayOfWeek = transferData.transferTime.getDay()
    if (!this.rules.transferTimeRestrictions.allowWeekendTransfers && (dayOfWeek === 0 || dayOfWeek === 6)) {
      errors.push('Weekend transfers are not allowed')
    }

    // Check rate adjustment policy
    if (transferData.rateChange && transferData.rateChange > 0) {
      if (!this.rules.rateAdjustmentPolicy.allowRateChanges) {
        errors.push('Rate changes are not allowed')
      } else if (this.rules.rateAdjustmentPolicy.requireApprovalForRateIncrease) {
        warnings.push('Rate increase requires manager approval')
      }
      
      const maxIncrease = this.rules.rateAdjustmentPolicy.maxRateIncreasePercentage
      if (transferData.rateChange > maxIncrease) {
        errors.push(`Rate increase cannot exceed ${maxIncrease}%`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Get transfer recommendations based on business rules
   */
  static getTransferRecommendations(bookingData: {
    currentRoomType: string
    currentFloor: number
    guestPreferences?: {
      preferredFloor?: number
      preferredRoomType?: string
    }
  }): {
    recommendedRooms: string[]
    reasons: string[]
  } {
    const recommendations: string[] = []
    const reasons: string[] = []

    // Same floor preference
    if (this.rules.allowSameFloorTransfer) {
      recommendations.push('same_floor')
      reasons.push('Same floor transfers are preferred')
    }

    // Room type compatibility
    const compatibleTypes = this.rules.roomTypeCompatibility[bookingData.currentRoomType] || []
    if (compatibleTypes.length > 1) {
      recommendations.push('compatible_room_type')
      reasons.push(`Compatible room types: ${compatibleTypes.join(', ')}`)
    }

    // Guest preferences
    if (bookingData.guestPreferences?.preferredFloor) {
      recommendations.push('guest_preferred_floor')
      reasons.push(`Guest prefers floor ${bookingData.guestPreferences.preferredFloor}`)
    }

    if (bookingData.guestPreferences?.preferredRoomType) {
      recommendations.push('guest_preferred_type')
      reasons.push(`Guest prefers ${bookingData.guestPreferences.preferredRoomType} room type`)
    }

    return {
      recommendedRooms: recommendations,
      reasons
    }
  }

  /**
   * Check if transfer requires approval
   */
  static requiresApproval(transferData: {
    rateChange?: number
    roomTypeChange: boolean
    transferTime: Date
  }): boolean {
    // Manager approval required for rate increases
    if (transferData.rateChange && transferData.rateChange > 0 && this.rules.rateAdjustmentPolicy.requireApprovalForRateIncrease) {
      return true
    }

    // Manager approval required for room type changes (if configured)
    if (transferData.roomTypeChange && this.rules.requireManagerApproval) {
      return true
    }

    // Manager approval required for transfers outside business hours
    const hour = transferData.transferTime.getHours()
    if (hour < this.rules.transferTimeRestrictions.allowedHours.start || 
        hour > this.rules.transferTimeRestrictions.allowedHours.end) {
      return true
    }

    return false
  }

  /**
   * Get notification recipients based on business rules
   */
  static getNotificationRecipients(): {
    guest: boolean
    housekeeping: boolean
    management: boolean
    frontDesk: boolean
  } {
    return { ...this.rules.notificationSettings }
  }
}

export default TransferBusinessRulesService
