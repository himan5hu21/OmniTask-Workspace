"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Lock,
  Camera, 
  AlertTriangle,
  Mail,
  Eye,
  EyeOff
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { 
  useAuthProfile, 
  useUpdateProfileMutation, 
  useChangePasswordMutation, 
  useDeactivateAccountMutation 
} from '@/api/auth';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn, getInitials } from '@/lib/utils';
import { buildAuthenticatedFileUrl } from '@/lib/file-url';
import { handleApiError } from '@/api/api-errors';
import { ButtonSpinner } from '@/components/ui/orbital-loader';

type Tab = 'profile' | 'security' | 'danger';

function UserProfileSettingsModalContent({ closeProfileSettings }: { closeProfileSettings: () => void }) {
  const { user } = useAuthProfile();
  
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  
  // Profile update state (initialized immediately during mount/render)
  const [name, setName] = useState(() => user?.name || '');
  const [email, setEmail] = useState(() => user?.email || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security (Password change) state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Danger Zone state
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Mutations
  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const deactivateAccountMutation = useDeactivateAccountMutation();

  // Clean up Object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleClose = () => {
    closeProfileSettings();
  };

  // Profile Photo Upload Handlers
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (Max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('File size exceeds the 5MB limit.');
      return;
    }

    // Validate image format
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid image type. Please select a PNG, JPG, JPEG, or WEBP image.');
      return;
    }

    // Create a local preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const localUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(localUrl);
  };

  // Submit Profile update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name field cannot be empty');
      return;
    }
    if (!email.trim()) {
      toast.error('Email field cannot be empty');
      return;
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('email', email.trim().toLowerCase());
    
    if (selectedFile) {
      formData.append('avatar_url', selectedFile);
    }

    updateProfileMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Profile updated successfully!');
        setSelectedFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      },
      onError: (err) => {
        handleApiError(err, {
          uniqueEmail: (msg) => toast.error(msg || 'This email address is already in use.'),
          onOtherError: (msg) => toast.error(msg),
        }, 'Failed to update profile.');
      }
    });
  };

  // Submit Password Change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 3) {
      toast.error('New password must be at least 3 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Confirm password does not match new password');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword
    }, {
      onSuccess: () => {
        toast.success('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      },
      onError: (err) => {
        handleApiError(err, {
          onOtherError: (msg) => toast.error(msg),
        }, 'Failed to change password. Please verify current password.');
      }
    });
  };

  // Account Deactivation Handler
  const handleDeactivateAccount = async () => {
    if (confirmText !== 'DEACTIVATE') {
      toast.error('Please type DEACTIVATE exactly to confirm.');
      return;
    }

    deactivateAccountMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Your account has been deactivated successfully.');
        handleClose();
        window.location.href = '/login';
      },
      onError: (err) => {
        handleApiError(err, {
          onOtherError: (msg) => toast.error(msg),
        }, 'Failed to deactivate account.');
      }
    });
  };

  const userInitials = getInitials(user?.name, "U");

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl rounded-xl w-[95vw] h-[80vh] md:h-[600px] flex flex-col md:flex-row">
          <DialogTitle className="sr-only">Account Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Manage your personal profile, secure password, and account preferences.
          </DialogDescription>
          
          {/* Left Sidebar Navigation */}
          <div className="w-full md:w-[240px] bg-muted/30 border-r border-border flex flex-col shrink-0">
            <div className="px-6 h-[72px] border-b border-border flex items-center">
              <div className="flex items-center gap-3 w-full">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary font-bold text-lg">
                  <User className="h-5 w-5" />
                </div>
                <h2 className="text-base font-bold tracking-tight text-foreground truncate">
                  Account Settings
                </h2>
              </div>
            </div>
            
            <nav className="flex-1 py-4 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible px-2 md:px-0 pr-6">
              <button 
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "px-4 py-2.5 mx-1 md:mx-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 whitespace-nowrap",
                  activeTab === 'profile' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <User className="h-4 w-4" />
                My Profile
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={cn(
                  "px-4 py-2.5 mx-1 md:mx-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 whitespace-nowrap",
                  activeTab === 'security' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Lock className="h-4 w-4" />
                Change Password
              </button>
              <button 
                onClick={() => setActiveTab('danger')}
                className={cn(
                  "px-4 py-2.5 mx-1 md:mx-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 whitespace-nowrap text-red-500 hover:text-red-600",
                  activeTab === 'danger' ? "bg-destructive text-destructive-foreground shadow-md hover:text-destructive-foreground" : "text-red-500/90 hover:bg-red-500/10"
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </button>
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            {/* Header */}
            <div className="px-6 pr-15 h-[72px] border-b border-border flex items-center justify-between shrink-0">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {activeTab === 'profile' && "Profile Information"}
                {activeTab === 'security' && "Security Settings"}
                {activeTab === 'danger' && "Deactivate Account"}
              </h1>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="px-6 py-6 space-y-6">
                
                {/* 1. PROFILE TAB */}
                {activeTab === 'profile' && (
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    
                    {/* Profile Picture Section */}
                    <div className="flex flex-col items-center sm:flex-row gap-6 p-4 border border-border bg-card/20 rounded-xl">
                      <div className="relative group cursor-pointer shrink-0" onClick={handlePhotoClick}>
                        <Avatar className="h-24 w-24 border-2 border-border shadow-md group-hover:border-primary/50 transition-all">
                          {previewUrl ? (
                            <AvatarImage src={previewUrl} className="object-cover" />
                          ) : user?.avatar_url ? (
                            <AvatarImage src={buildAuthenticatedFileUrl(user.avatar_url)} className="object-cover" />
                          ) : null}
                          <AvatarFallback className="text-3xl font-extrabold bg-primary/10 text-primary uppercase">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Camera className="h-6 w-6 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-center sm:text-left flex-1">
                        <h3 className="text-sm font-bold">Profile Photo</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
                          Accepts PNG, JPG, JPEG, or WEBP up to 5MB. A square ratio works best.
                        </p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="h-8 rounded-lg mt-2 font-bold text-xs"
                          onClick={handlePhotoClick}
                        >
                          Change Photo
                        </Button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/png, image/jpeg, image/jpg, image/webp" 
                          onChange={handleFileChange}
                        />
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="profile-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                        <Input 
                          id="profile-name" 
                          placeholder="Your Name" 
                          className="h-11 rounded-xl border-border bg-muted/20 focus:bg-background focus-visible:ring-offset-0"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="profile-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                        <div className="relative group">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                          <Input 
                            id="profile-email" 
                            type="email"
                            placeholder="you@example.com" 
                            className="h-11 pl-11 rounded-xl border-border bg-muted/20 focus:bg-background focus-visible:ring-offset-0"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4 border-t border-border mt-6">
                      <Button 
                        type="submit" 
                        className="h-11 rounded-xl px-6 text-sm font-bold shadow-md shadow-primary/20 hover:shadow-primary/30"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? <ButtonSpinner className="mr-2" /> : null}
                        Save Profile Changes
                      </Button>
                    </div>
                  </form>
                )}

                {/* 2. SECURITY TAB */}
                {activeTab === 'security' && (
                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div className="space-y-4">
                      
                      {/* Current Password */}
                      <div className="space-y-1.5">
                        <Label htmlFor="current-pass" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Password</Label>
                        <div className="relative">
                          <Input 
                            id="current-pass" 
                            type={showCurrentPassword ? "text" : "password"} 
                            placeholder="Enter current password" 
                            className="h-11 rounded-xl border-border bg-muted/20 focus:bg-background pr-10 focus-visible:ring-offset-0"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div className="space-y-1.5">
                        <Label htmlFor="new-pass" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Password</Label>
                        <div className="relative">
                          <Input 
                            id="new-pass" 
                            type={showNewPassword ? "text" : "password"} 
                            placeholder="Enter new password (min. 3 characters)" 
                            className="h-11 rounded-xl border-border bg-muted/20 focus:bg-background pr-10 focus-visible:ring-offset-0"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div className="space-y-1.5">
                        <Label htmlFor="confirm-pass" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm New Password</Label>
                        <div className="relative">
                          <Input 
                            id="confirm-pass" 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="Confirm new password" 
                            className="h-11 rounded-xl border-border bg-muted/20 focus:bg-background pr-10 focus-visible:ring-offset-0"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4 border-t border-border mt-6">
                      <Button 
                        type="submit" 
                        className="h-11 rounded-xl px-6 text-sm font-bold shadow-md"
                        disabled={changePasswordMutation.isPending}
                      >
                        {changePasswordMutation.isPending ? <ButtonSpinner className="mr-2" /> : null}
                        Update Password
                      </Button>
                    </div>
                  </form>
                )}

                {/* 3. DANGER ZONE TAB */}
                {activeTab === 'danger' && (
                  <div className="space-y-6">
                    <div className="p-5 border border-red-500/20 bg-red-500/5 rounded-xl space-y-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-red-500">Deactivating Your Account</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            This will temporarily disable your profile and lock you out of all workspace activities. 
                            If you decide to register again with this email, your account can be reactivated with your previous history.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button 
                          type="button" 
                          variant="destructive"
                          className="h-11 rounded-xl px-6 text-sm font-bold"
                          onClick={() => setIsDeactivateDialogOpen(true)}
                        >
                          Deactivate Account
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Accompanying Account Deactivation Confirmation Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent className="max-w-[420px] rounded-xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Confirm Account Deactivation
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1.5">
              This action requires absolute confirmation. Please type <span className="font-mono bg-destructive/10 text-destructive font-bold px-1.5 py-0.5 rounded text-[10px]">DEACTIVATE</span> in the input below to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Input
              placeholder="DEACTIVATE"
              className="h-10 rounded-lg text-sm border-border bg-muted/20 text-center font-bold tracking-widest uppercase focus-visible:ring-offset-0"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="ghost" 
              onClick={() => { setIsDeactivateDialogOpen(false); setConfirmText(''); }}
              className="h-10 rounded-lg font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivateAccount}
              disabled={confirmText !== 'DEACTIVATE' || deactivateAccountMutation.isPending}
              className="h-10 rounded-lg font-bold text-xs shadow-md"
            >
              {deactivateAccountMutation.isPending ? <ButtonSpinner className="mr-2" /> : null}
              Confirm Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function UserProfileSettingsModal() {
  const { isProfileSettingsOpen, closeProfileSettings } = useUIStore();
  
  if (!isProfileSettingsOpen) return null;
  
  return (
    <UserProfileSettingsModalContent closeProfileSettings={closeProfileSettings} />
  );
}
