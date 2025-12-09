# Time Tracking System

## Overview
The bot now tracks time spent on tasks with detailed timestamps for every work session.

## Notion Fields

### 1. **Started Working On** (Date)
- **Purpose**: Tracks when the current work session started
- **Updated**: Every time task is set to "Working"
- **Used for**: Calculating time spent in current session

### 2. **Last Started Time** (Date)
- **Purpose**: Records the most recent time the task was started
- **Updated**: Every time task is set to "Working"
- **Used for**: Historical tracking of when work resumed

### 3. **Last Paused Time** (Date)
- **Purpose**: Records the most recent time the task was paused
- **Updated**: Every time task is set to "On Hold" or "Done" (from Working)
- **Used for**: Historical tracking of when work was paused

### 4. **Time Spent (Seconds)** (Number)
- **Purpose**: Cumulative total time spent working on the task
- **Updated**: When task transitions from "Working" to "On Hold" or "Done"
- **Used for**: Total time tracking across all work sessions

## How It Works

### Scenario 1: Simple Work Session
```
10:00 AM - Click "Working"
  → Started Working On: 10:00 AM
  → Last Started Time: 10:00 AM

10:30 AM - Click "Done"
  → Time Spent: 1800 seconds (30 minutes)
  → Last Paused Time: 10:30 AM
```

### Scenario 2: Multiple Work Sessions
```
Day 1:
10:00 AM - Click "Working"
  → Started Working On: 10:00 AM
  → Last Started Time: 10:00 AM

11:00 AM - Click "On Hold"
  → Time Spent: 3600 seconds (1 hour)
  → Last Paused Time: 11:00 AM

Day 2:
2:00 PM - Click "Working"
  → Started Working On: 2:00 PM
  → Last Started Time: 2:00 PM

3:30 PM - Click "On Hold"
  → Time Spent: 9000 seconds (1h + 1.5h = 2.5 hours)
  → Last Paused Time: 3:30 PM

Day 3:
9:00 AM - Click "Working"
  → Started Working On: 9:00 AM
  → Last Started Time: 9:00 AM

10:00 AM - Click "Done"
  → Time Spent: 12600 seconds (2.5h + 1h = 3.5 hours total)
  → Last Paused Time: 10:00 AM
```

## Benefits

1. **Accurate Time Tracking**: Cumulative time across all work sessions
2. **Session History**: Know when work was last started/paused
3. **Productivity Insights**: See total time invested in each task
4. **Flexible Work**: Pause and resume without losing time data

## Technical Details

### When "Working" is clicked:
- Records current timestamp in both `Started Working On` and `Last Started Time`
- This marks the beginning of a new work session

### When "On Hold" is clicked (from Working):
- Calculates: `current_time - Started Working On`
- Adds result to `Time Spent (Seconds)`
- Records current timestamp in `Last Paused Time`

### When "Done" is clicked (from Working):
- Calculates: `current_time - Started Working On`
- Adds result to `Time Spent (Seconds)`
- Records current timestamp in `Last Paused Time`
- Marks task as complete

## Viewing Time Data

You can view all time tracking data in your Notion database:
- **Time Spent (Seconds)**: Total cumulative time
- **Last Started Time**: When you last resumed work
- **Last Paused Time**: When you last paused work

To convert seconds to hours: `Time Spent (Seconds) / 3600`

Example: 12600 seconds = 3.5 hours
