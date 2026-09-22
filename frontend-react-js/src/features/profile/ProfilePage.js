import React from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';
import { resizeToAvatar } from '../../lib/image';
import Avatar from '../../components/Avatar';
import { ChevronRight } from '../../components/icons';
import { useSignOut } from '../auth/useSignOut';
import { useProfile } from './ProfileContext';

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export default function ProfilePage() {
  const { profile, setProfile } = useProfile();
  const signOut = useSignOut();
  const fileInput = React.useRef(null);
  const [name, setName] = React.useState('');
  const [photoBusy, setPhotoBusy] = React.useState(false);
  const [photoError, setPhotoError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [nameError, setNameError] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (profile) setName(profile.display_name);
  }, [profile]);

  async function choosePhoto(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setPhotoError('');
    if (!file.type.startsWith('image/') || file.size > MAX_SOURCE_BYTES) {
      setPhotoError('Choose a photo (JPG, PNG or WebP) under 15 MB.');
      return;
    }
    setPhotoBusy(true);
    try {
      const image = await resizeToAvatar(file);
      setProfile(await apiRequest('/api/me/avatar', { method: 'PUT', body: { image } }));
    } catch (err) {
      setPhotoError(err && err.errors ? describeApiError(err) : 'That file could not be read as an image.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoError('');
    setPhotoBusy(true);
    try {
      setProfile(await apiRequest('/api/me/avatar', { method: 'DELETE' }));
    } catch (err) {
      setPhotoError(describeApiError(err));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function saveName(event) {
    event.preventDefault();
    setSaving(true);
    setNameError('');
    setSaved(false);
    try {
      setProfile(await apiRequest('/api/me', { method: 'PATCH', body: { display_name: name } }));
      setSaved(true);
    } catch (err) {
      setNameError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  }

  const unchanged = !profile || name.trim() === profile.display_name;

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-12 pt-6 sm:pt-10">
      <h1 className="font-display text-[38px] font-extrabold leading-none tracking-tight">Profile</h1>

      <section aria-label="Profile photo" className="card mt-6 flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-center">
        <Avatar profile={profile} size={96} alt="Your profile photo" />
        <div className="text-center sm:text-left">
          <p className="font-display text-xl font-bold">{profile ? profile.display_name : ' '}</p>
          <p className="text-sm text-fg-mute">{profile ? `@${profile.handle}` : ' '}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <input ref={fileInput} type="file" accept="image/*" onChange={choosePhoto} className="hidden" aria-label="Choose a profile photo" />
            <button type="button" onClick={() => fileInput.current && fileInput.current.click()} disabled={photoBusy || !profile} className="btn-secondary">
              {photoBusy ? 'Working...' : profile && profile.avatar ? 'Change photo' : 'Add photo'}
            </button>
            {profile && profile.avatar && (
              <button type="button" onClick={removePhoto} disabled={photoBusy} className="btn-secondary">Remove</button>
            )}
          </div>
        </div>
      </section>
      {photoError && <div role="alert" className="alert-error mt-3">{photoError}</div>}

      <form onSubmit={saveName} className="card mt-4 p-5">
        <label htmlFor="profile-name" className="field-label">Display name</label>
        <div className="flex gap-2.5">
          <input id="profile-name" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} maxLength={50} disabled={!profile} className="input min-w-0 flex-1" />
          <button type="submit" disabled={saving || unchanged || !name.trim()} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
        </div>
        {nameError && <div role="alert" className="alert-error mt-3">{nameError}</div>}
        {saved && <p role="status" className="mt-3 text-sm text-fg-mute">Saved.</p>}
        <p className="mt-3 text-xs text-fg-mute">Your username{profile ? ` (@${profile.handle})` : ''} is your sign-in and cannot be changed here.</p>
      </form>

      <ul className="card mt-4 overflow-hidden">
        <li>
          <Link to="/settings" className="flex h-14 items-center justify-between px-4 text-fg hover:bg-ink-800 hover:no-underline">Settings<ChevronRight width={18} height={18} className="text-fg-mute" /></Link>
        </li>
        <li className="border-t border-ink-700">
          <Link to="/support" className="flex h-14 items-center justify-between px-4 text-fg hover:bg-ink-800 hover:no-underline">Contact support<ChevronRight width={18} height={18} className="text-fg-mute" /></Link>
        </li>
      </ul>

      <button type="button" onClick={signOut} className="btn-secondary mt-4 w-full">Sign out</button>
    </div>
  );
}
