# Vault Wizard

Vault Wizard is an Obsidian plugin for chatting with your notes.

## Overview

The plugin adds a chat interface inside Obsidian and uses note content as context for AI responses.

Current behavior:
- Chat with context from the currently open note
- Prompt-cache friendly interactions
- Context refreshed when the current file is modified
- Debug section with token usage details
- Azure provider support

## Add a Model

1. Open Vault Wizard in Obsidian.
2. Go to the plugin settings/panel.
3. Add a new model configuration.
4. Select the provider (currently Azure).
5. Fill in the required model fields and save.
6. Select the saved model in chat before sending messages.

## Configuration Storage

Vault Wizard stores model settings in the vault plugin folder:

`.obsidian/plugins/vault_wizard/.model_settings.json`

## Roadmap

- Persistent chats
- Workspace-based knowledge scope
- Multiple AI providers (beyond Azure)
- Model-specific configuration

## Status

Active development.