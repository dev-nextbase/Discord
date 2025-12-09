# Backlog Feature Implementation Plan

## Overview
Add backlog functionality to allow team leads to move tasks to a backlog channel and reassign them later.

## Components to Implement

### 1. Channel Management (channelManagerNotion.js)
- [ ] Add `setTeamBacklogChannel(teamName, channelId)` function
- [ ] Add `getTeamBacklogChannel(teamName)` function
- [ ] Update cache to include backlog channels

### 2. Notion Config Service (notionConfigService.js)
- [ ] Add "Team Backlog Channel" type support
- [ ] Update cache refresh to include backlog channels

### 3. Notion Service (notionService.js)
- [ ] Add `moveTaskToBacklog(pageId)` function - clears assignee
- [ ] Add `getBacklogTasks(teamName)` function - gets tasks with no assignee
- [ ] Update `reassignTask` to handle backlog tasks

### 4. Button Handler (buttonHandler.js)
- [ ] Modify reassign button to include "Backlog" option
- [ ] Add handler for moving to backlog
- [ ] Send task to backlog channel with special format

### 5. Select Menu Handler (selectMenuHandler.js)
- [ ] Update to handle "backlog" selection
- [ ] Remove task from backlog channel when reassigned
- [ ] Send to new assignee's personal channel

### 6. New Command: Backlog List
- [ ] Create `/backlog` or `?team backlogs` command
- [ ] Show paginated list of backlog tasks
- [ ] Only accessible to team leads
- [ ] Show task details with reassign buttons

## Task Flow

### Moving to Backlog:
1. Team lead clicks "Reassign" on task
2. Dropdown shows team members + "📋 Backlog"
3. Select "Backlog"
4. Task moved to backlog channel with embed
5. Notion: Assigned To = empty, Status = "On Hold"
6. Remove from personal channel

### Reassigning from Backlog:
1. Team lead uses reassign button in backlog channel
2. Select team member
3. Task removed from backlog channel
4. Task sent to member's personal channel
5. Notion: Assigned To = member, Status = "On Hold"

## Files to Modify
1. services/channelManagerNotion.js
2. services/notionConfigService.js
3. services/notionService.js
4. handlers/buttonHandler.js
5. handlers/selectMenuHandler.js
6. handlers/teamCommand.js (already done)
7. NEW: commands/backlog.js or add to teamCommand.js

## Priority Order
1. Channel management functions
2. Notion service functions
3. Move to backlog functionality
4. Reassign from backlog
5. View backlogs command
