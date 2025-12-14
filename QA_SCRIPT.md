# Manual QA Testing Script

## Prerequisites
1. Start the development server: `cd web && npm run dev`
2. Open browser to `http://localhost:3000`
3. Open browser DevTools (F12) to check console for errors

## Test Flow 1: Unauthenticated User Journey

### 1.1 Home Page (Unauthenticated)
- [ ] Page loads without errors
- [ ] TopNav shows "Log in" and "Sign up" buttons
- [ ] No sidebar visible
- [ ] Home page shows welcome message and CTA cards
- [ ] "Log In" button navigates to `/login`
- [ ] "Sign Up" button navigates to `/register`

### 1.2 Registration Flow
- [ ] Navigate to `/register`
- [ ] Form displays in Card component
- [ ] All input fields have labels
- [ ] Try submitting empty form → validation errors appear
- [ ] Enter password < 8 chars → error message shows
- [ ] Enter mismatched passwords → error message shows
- [ ] Fill valid form and submit → redirects to confirmation page
- [ ] Check email for confirmation code

### 1.3 Email Confirmation
- [ ] Confirmation page shows email (disabled field)
- [ ] OTP input is large, centered, monospace
- [ ] Enter 6-digit code → submits correctly
- [ ] "Resend code" button works
- [ ] Success message appears when code resent
- [ ] After confirmation → redirects to login

### 1.4 Login
- [ ] Navigate to `/login`
- [ ] Form displays in Card component
- [ ] Enter invalid credentials → error message shows
- [ ] Enter valid credentials → redirects to home
- [ ] After login, sidebar and topnav appear

## Test Flow 2: Authenticated User Journey

### 2.1 Home Page (Authenticated)
- [ ] Sidebar appears on left (desktop) or hidden (mobile)
- [ ] TopNav shows user avatar/name and dropdown
- [ ] Home page shows welcome message with user name
- [ ] Dashboard and Users cards are clickable
- [ ] Click "Open Dashboard" → navigates to `/agent-dashboard`
- [ ] Click "Manage Users" → navigates to `/users`

### 2.2 Sidebar Navigation
- [ ] Sidebar shows "Dashboard" and "Users" links
- [ ] Active route is highlighted (primary color background)
- [ ] Click "Dashboard" → navigates to `/agent-dashboard`
- [ ] Click "Users" → navigates to `/users`
- [ ] On mobile (< 768px):
  - [ ] Sidebar is hidden by default
  - [ ] Hamburger menu button appears top-left
  - [ ] Click hamburger → sidebar slides in
  - [ ] Click backdrop → sidebar closes
  - [ ] Click link → sidebar closes

### 2.3 TopNav User Menu
- [ ] Click user avatar/name → dropdown opens
- [ ] Dropdown shows user name and email
- [ ] Click "Log out" → logs out and redirects to login
- [ ] Notifications icon is visible (placeholder)

## Test Flow 3: Users Management Page

### 3.1 Page Load
- [ ] Navigate to `/users`
- [ ] Page header shows "Users Management"
- [ ] Refresh button visible
- [ ] Loading skeleton appears during fetch
- [ ] Table displays users when loaded

### 3.2 Table Functionality
- [ ] Table has sticky header
- [ ] All columns display: ID, Name, Email, Created At
- [ ] Table rows hover effect works
- [ ] Empty state shows if no users
- [ ] Pagination controls work (Previous/Next)
- [ ] Page number displays correctly

### 3.3 Actions
- [ ] Click "Refresh" → toast notification appears
- [ ] Table refreshes with new data
- [ ] Error state displays if API fails
- [ ] Error card shows retry option

## Test Flow 4: Agent Dashboard

### 4.1 Page Load
- [ ] Navigate to `/agent-dashboard`
- [ ] Loading skeleton appears during fetch
- [ ] Page header shows "Agent Runner Dashboard"
- [ ] Last updated time displays

### 4.2 Stats Cards
- [ ] Four stat cards display: Total, To Do, In Progress, Completed
- [ ] Numbers are correct
- [ ] Cards have hover elevation effect
- [ ] Cards are responsive (stack on mobile)

### 4.3 Agent Runner Control
- [ ] Control card shows current status (Running/Stopped)
- [ ] Status indicator (green dot) pulses when running
- [ ] PID displays if process info available
- [ ] Control buttons work:
  - [ ] "Start Agent Runner" when stopped
  - [ ] "Restart" and "Stop" when running
- [ ] Toast notification appears on action
- [ ] Status updates after action

### 4.4 Queue Status (if config available)
- [ ] Queue card displays
- [ ] Active slots show in grid (3 columns desktop, responsive mobile)
- [ ] Active slots show ticket info
- [ ] Available slots show "Available" text
- [ ] Queue stats display: Status, Ready to Start, Poll Interval

### 4.5 Tickets Table
- [ ] Table displays all tickets
- [ ] Columns: ID, Title, Status, Priority, Agent, Sprint, Dependencies
- [ ] Status badges show correct colors:
  - [ ] Completed = green
  - [ ] In Progress = blue
  - [ ] In Review = yellow
  - [ ] To Do = gray
- [ ] Priority badges show correct colors:
  - [ ] High = red
  - [ ] Medium = yellow
  - [ ] Low = green
- [ ] Ready tickets have green background highlight
- [ ] Dependencies show as badges (green if met, red if not)
- [ ] Empty state shows if no tickets

### 4.6 Auto-Refresh
- [ ] Toggle "Auto-refresh" on → data refreshes every 5 seconds
- [ ] Toggle off → stops auto-refresh
- [ ] Manual "Refresh" button works

## Test Flow 5: Responsive Design

### 5.1 Mobile (< 768px)
- [ ] Sidebar hidden, hamburger menu visible
- [ ] TopNav user menu works
- [ ] All pages are readable and usable
- [ ] Tables scroll horizontally
- [ ] Cards stack vertically
- [ ] Touch targets are at least 44x44px

### 5.2 Tablet (768px - 1024px)
- [ ] Sidebar visible
- [ ] Grid layouts adapt (2 columns where appropriate)
- [ ] All content readable

### 5.3 Desktop (> 1024px)
- [ ] Full sidebar visible
- [ ] All grid layouts show maximum columns
- [ ] Optimal spacing and layout

## Test Flow 6: Accessibility

### 6.1 Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus rings visible on all focusable elements
- [ ] Enter activates buttons/links
- [ ] Escape closes modals/dropdowns
- [ ] Arrow keys work in dropdowns (if applicable)

### 6.2 Screen Reader
- [ ] All images have alt text or aria-hidden
- [ ] Form labels are properly associated
- [ ] Error messages are announced
- [ ] Status changes are announced
- [ ] ARIA labels present where needed

### 6.3 Visual
- [ ] Focus states are clearly visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Text is readable at all sizes
- [ ] No content relies solely on color

## Test Flow 7: Error Handling

### 7.1 Network Errors
- [ ] Disable network → error states display
- [ ] Error messages are user-friendly
- [ ] Retry options available
- [ ] No console errors

### 7.2 Form Validation
- [ ] Required fields show errors
- [ ] Email format validation works
- [ ] Password length validation works
- [ ] Error messages are clear

## Test Flow 8: Performance

### 8.1 Loading States
- [ ] Skeleton loaders appear during data fetch
- [ ] No layout shift during loading
- [ ] Loading spinners show on buttons during actions

### 8.2 Interactions
- [ ] Buttons show loading state during async operations
- [ ] No duplicate API calls
- [ ] Toast notifications don't stack excessively

## Console Checks
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] No network errors (except intentional tests)
- [ ] No accessibility warnings

## Visual Regression Checks
- [ ] All pages match design system
- [ ] Consistent spacing throughout
- [ ] Colors match design tokens
- [ ] Typography is consistent
- [ ] Shadows and borders are consistent

## Notes
- Test in Chrome, Firefox, and Safari
- Test on iOS and Android devices
- Test with screen reader (VoiceOver/NVDA)
- Test with keyboard only (no mouse)

