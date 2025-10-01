"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Clock, 
  Bell, 
  DollarSign, 
  Building,
  Save,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TransferBusinessRulesService, type TransferBusinessRules } from "@/lib/transfer-business-rules";

export function TransferBusinessRules() {
  const { toast } = useToast();
  const [rules, setRules] = useState<TransferBusinessRules>(TransferBusinessRulesService.getRules());
  const [hasChanges, setHasChanges] = useState(false);

  const handleRuleChange = (path: string, value: any) => {
    const newRules = { ...rules };
    const keys = path.split('.');
    let current = newRules;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i] as keyof typeof current] as any;
    }
    
    current[keys[keys.length - 1] as keyof typeof current] = value;
    setRules(newRules);
    setHasChanges(true);
  };

  const handleSave = () => {
    TransferBusinessRulesService.updateRules(rules);
    setHasChanges(false);
    toast({
      title: "Success",
      description: "Business rules updated successfully.",
    });
  };

  const handleReset = () => {
    TransferBusinessRulesService.resetToDefaults();
    setRules(TransferBusinessRulesService.getRules());
    setHasChanges(false);
    toast({
      title: "Reset",
      description: "Business rules reset to defaults.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transfer Business Rules</h2>
          <p className="text-muted-foreground">Configure room transfer policies and restrictions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sameFloor">Allow Same Floor Transfers</Label>
                <p className="text-sm text-muted-foreground">Prefer transfers within the same floor</p>
              </div>
              <Switch
                id="sameFloor"
                checked={rules.allowSameFloorTransfer}
                onCheckedChange={(checked) => handleRuleChange('allowSameFloorTransfer', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="differentType">Allow Different Room Types</Label>
                <p className="text-sm text-muted-foreground">Allow transfers to different room types</p>
              </div>
              <Switch
                id="differentType"
                checked={rules.allowDifferentRoomType}
                onCheckedChange={(checked) => handleRuleChange('allowDifferentRoomType', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="guestConsent">Require Guest Consent</Label>
                <p className="text-sm text-muted-foreground">Require guest approval for transfers</p>
              </div>
              <Switch
                id="guestConsent"
                checked={rules.requireGuestConsent}
                onCheckedChange={(checked) => handleRuleChange('requireGuestConsent', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="managerApproval">Require Manager Approval</Label>
                <p className="text-sm text-muted-foreground">Require manager approval for transfers</p>
              </div>
              <Switch
                id="managerApproval"
                checked={rules.requireManagerApproval}
                onCheckedChange={(checked) => handleRuleChange('requireManagerApproval', checked)}
              />
            </div>

            <div>
              <Label htmlFor="maxTransfers">Maximum Transfers per Booking</Label>
              <Input
                id="maxTransfers"
                type="number"
                min="1"
                max="10"
                value={rules.maxTransfersPerBooking}
                onChange={(e) => handleRuleChange('maxTransfersPerBooking', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Time Restrictions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Restrictions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startHour">Start Hour</Label>
                <Input
                  id="startHour"
                  type="number"
                  min="0"
                  max="23"
                  value={rules.transferTimeRestrictions.allowedHours.start}
                  onChange={(e) => handleRuleChange('transferTimeRestrictions.allowedHours.start', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="endHour">End Hour</Label>
                <Input
                  id="endHour"
                  type="number"
                  min="0"
                  max="23"
                  value={rules.transferTimeRestrictions.allowedHours.end}
                  onChange={(e) => handleRuleChange('transferTimeRestrictions.allowedHours.end', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekend">Allow Weekend Transfers</Label>
                <p className="text-sm text-muted-foreground">Allow transfers on weekends</p>
              </div>
              <Switch
                id="weekend"
                checked={rules.transferTimeRestrictions.allowWeekendTransfers}
                onCheckedChange={(checked) => handleRuleChange('transferTimeRestrictions.allowWeekendTransfers', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="holiday">Allow Holiday Transfers</Label>
                <p className="text-sm text-muted-foreground">Allow transfers on holidays</p>
              </div>
              <Switch
                id="holiday"
                checked={rules.transferTimeRestrictions.allowHolidayTransfers}
                onCheckedChange={(checked) => handleRuleChange('transferTimeRestrictions.allowHolidayTransfers', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifyGuest">Notify Guest</Label>
                <p className="text-sm text-muted-foreground">Send notification to guest</p>
              </div>
              <Switch
                id="notifyGuest"
                checked={rules.notificationSettings.notifyGuest}
                onCheckedChange={(checked) => handleRuleChange('notificationSettings.notifyGuest', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifyHousekeeping">Notify Housekeeping</Label>
                <p className="text-sm text-muted-foreground">Send notification to housekeeping</p>
              </div>
              <Switch
                id="notifyHousekeeping"
                checked={rules.notificationSettings.notifyHousekeeping}
                onCheckedChange={(checked) => handleRuleChange('notificationSettings.notifyHousekeeping', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifyManagement">Notify Management</Label>
                <p className="text-sm text-muted-foreground">Send notification to management</p>
              </div>
              <Switch
                id="notifyManagement"
                checked={rules.notificationSettings.notifyManagement}
                onCheckedChange={(checked) => handleRuleChange('notificationSettings.notifyManagement', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifyFrontDesk">Notify Front Desk</Label>
                <p className="text-sm text-muted-foreground">Send notification to front desk</p>
              </div>
              <Switch
                id="notifyFrontDesk"
                checked={rules.notificationSettings.notifyFrontDesk}
                onCheckedChange={(checked) => handleRuleChange('notificationSettings.notifyFrontDesk', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rate Adjustment Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Rate Adjustment Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowRateChanges">Allow Rate Changes</Label>
                <p className="text-sm text-muted-foreground">Allow rate adjustments during transfer</p>
              </div>
              <Switch
                id="allowRateChanges"
                checked={rules.rateAdjustmentPolicy.allowRateChanges}
                onCheckedChange={(checked) => handleRuleChange('rateAdjustmentPolicy.allowRateChanges', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="requireApproval">Require Approval for Rate Increase</Label>
                <p className="text-sm text-muted-foreground">Require approval for rate increases</p>
              </div>
              <Switch
                id="requireApproval"
                checked={rules.rateAdjustmentPolicy.requireApprovalForRateIncrease}
                onCheckedChange={(checked) => handleRuleChange('rateAdjustmentPolicy.requireApprovalForRateIncrease', checked)}
              />
            </div>

            <div>
              <Label htmlFor="maxIncrease">Maximum Rate Increase (%)</Label>
              <Input
                id="maxIncrease"
                type="number"
                min="0"
                max="100"
                value={rules.rateAdjustmentPolicy.maxRateIncreasePercentage}
                onChange={(e) => handleRuleChange('rateAdjustmentPolicy.maxRateIncreasePercentage', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Room Type Compatibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Room Type Compatibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure which room types can be transferred to from each room type.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(rules.roomTypeCompatibility).map(([fromType, toTypes]) => (
                <div key={fromType} className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 capitalize">{fromType} Room</h4>
                  <div className="flex flex-wrap gap-2">
                    {toTypes.map((toType) => (
                      <Badge key={toType} variant="outline" className="capitalize">
                        {toType}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changes Indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-orange-100 border border-orange-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">
              You have unsaved changes
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
