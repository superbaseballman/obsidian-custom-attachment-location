import type { Vault as VaultOriginal } from 'obsidian';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { VaultCreateBinaryEnsureFolderPatchComponent } from './vault-create-binary-ensure-folder-patch-component.ts';

describe('VaultCreateBinaryEnsureFolderPatchComponent', () => {
  let app: App;
  let vault: VaultOriginal;

  beforeEach(() => {
    app = App.createConfigured__();
    vault = app.vault.asOriginalType2__();
  });

  function createComponent(shouldCreateNoMediaFile = false): VaultCreateBinaryEnsureFolderPatchComponent {
    const pluginSettingsComponent = castTo<PluginSettingsComponent>({
      settings: { shouldCreateNoMediaFile }
    });
    return new VaultCreateBinaryEnsureFolderPatchComponent({
      app: app.asOriginalType__(),
      pluginSettingsComponent,
      vault
    });
  }

  it('should register a single method patch on load', () => {
    const component = createComponent();
    const registerMethodPatchSpy = vi.spyOn(component, 'registerMethodPatch');

    component.load();

    expect(registerMethodPatchSpy).toHaveBeenCalledTimes(1);
  });

  it('should create the missing parent folder before writing the attachment', async () => {
    const component = createComponent();
    component.load();

    expect(await vault.exists('deep/nested')).toBe(false);

    await vault.createBinary('deep/nested/file.bin', new ArrayBuffer(4));

    /*
     * The folder is materialized just-in-time by the write (issue #26): folders appear only when an
     * attachment is actually saved, not on a bare `getAvailablePathForAttachments` resolution.
     */
    expect(await vault.exists('deep/nested')).toBe(true);
    expect(vault.getAbstractFileByPath('deep/nested/file.bin')).not.toBeNull();
  });

  it('should not create a folder when the parent already exists', async () => {
    const component = createComponent();
    component.load();

    await vault.createFolder('existing');
    const createFolderSpy = vi.spyOn(vault, 'createFolder');

    await vault.createBinary('existing/file.bin', new ArrayBuffer(4));

    expect(createFolderSpy).not.toHaveBeenCalled();
    expect(vault.getAbstractFileByPath('existing/file.bin')).not.toBeNull();
  });

  it('should not create a folder for a root-level path', async () => {
    const component = createComponent();
    component.load();

    const createFolderSpy = vi.spyOn(vault, 'createFolder');

    await vault.createBinary('root.bin', new ArrayBuffer(4));

    expect(createFolderSpy).not.toHaveBeenCalled();
    expect(vault.getAbstractFileByPath('root.bin')).not.toBeNull();
  });

  it('should create a .nomedia file in the new folder when the setting is enabled', async () => {
    const component = createComponent(true);
    component.load();

    expect(await vault.exists('deep/nested')).toBe(false);

    await vault.createBinary('deep/nested/file.bin', new ArrayBuffer(4));

    expect(await vault.exists('deep/nested')).toBe(true);
    expect(await vault.exists('deep/nested/.nomedia')).toBe(true);
    expect(vault.getAbstractFileByPath('deep/nested/file.bin')).not.toBeNull();
  });

  it('should not create a .nomedia file when the setting is disabled', async () => {
    const component = createComponent(false);
    component.load();

    await vault.createBinary('deep/nested/file.bin', new ArrayBuffer(4));

    expect(await vault.exists('deep/nested/.nomedia')).toBe(false);
  });

  it('should not create a .nomedia file when the parent folder already exists', async () => {
    const component = createComponent(true);
    component.load();

    await vault.createFolder('existing');
    await vault.create('existing/.nomedia', '');

    const createSpy = vi.spyOn(vault, 'create');

    await vault.createBinary('existing/file.bin', new ArrayBuffer(4));

    expect(createSpy).not.toHaveBeenCalled();
    expect(vault.getAbstractFileByPath('existing/file.bin')).not.toBeNull();
  });
});
