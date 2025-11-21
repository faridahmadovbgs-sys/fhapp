# 💰 Billing System Documentation

## Overview
The billing system allows account owners to create bills and track payments from organization members. Members can view their bills and make payments through a secure interface.

## Features

### For Account Owners (Admin)
- ✅ Create one-time or subscription bills
- ✅ Assign bills to all members or specific members
- ✅ Track payment status and history
- ✅ View total amounts paid and outstanding
- ✅ Cancel or manage active bills
- ✅ Set due dates for bills
- ✅ Add descriptions and customize bill details

### For Members
- ✅ View all pending bills
- ✅ See payment history
- ✅ Make payments with various methods
- ✅ Track total amounts paid
- ✅ Receive payment confirmation

## Database Structure

### Bills Collection (`bills`)
```javascript
{
  id: "bill-id",
  title: "Monthly Membership Fee",
  description: "Standard membership for January 2025",
  amount: 50.00,
  billType: "one-time" | "subscription",
  subscriptionInterval: "monthly" | "quarterly" | "yearly", // if subscription
  dueDate: Timestamp,
  organizationId: "org-id",
  organizationName: "Organization Name",
  ownerId: "owner-user-id",
  memberIds: ["member-id-1", "member-id-2"], // null for all members
  status: "active" | "cancelled" | "completed",
  totalPaid: 150.00,
  totalDue: 200.00,
  createdAt: Timestamp,
  lastPaymentAt: Timestamp
}
```

### Payments Collection (`payments`)
```javascript
{
  id: "payment-id",
  billId: "bill-id",
  memberId: "member-user-id",
  memberName: "John Doe",
  memberEmail: "john@example.com",
  amount: 50.00,
  organizationId: "org-id",
  organizationName: "Organization Name",
  paymentMethod: "credit_card" | "debit_card" | "paypal" | "bank_transfer",
  billTitle: "Monthly Membership Fee",
  billType: "one-time" | "subscription",
  paidAt: Timestamp,
  status: "completed"
}
```

## Firebase Firestore Rules

Add these rules to your Firestore security rules:

```javascript
// Bills collection
match /bills/{billId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn();
  allow update, delete: if isSignedIn() && request.auth.uid == resource.data.ownerId;
}

// Payments collection
match /payments/{paymentId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn();
  allow update, delete: if isSignedIn() && request.auth.uid == resource.data.memberId;
}
```

## Usage

### Account Owner - Creating a Bill

1. Navigate to **💰 Billing** in the header
2. Click **➕ Create New Bill**
3. Fill in the form:
   - **Bill Title**: e.g., "Monthly Membership Fee"
   - **Description**: Additional details (optional)
   - **Amount**: Dollar amount (e.g., 50.00)
   - **Bill Type**: One-Time or Subscription
   - **Billing Interval**: For subscriptions (monthly/quarterly/yearly)
   - **Due Date**: Optional payment deadline
   - **Assign to**: All members or specific members
4. Click **Create Bill**

### Account Owner - Managing Bills

- View all bills in a grid layout
- See payment status, total paid, and number of payments
- Click **View Details** to see payment history
- Cancel active bills if needed
- Filter by bill status (active, cancelled, completed)

### Member - Viewing Bills

1. Navigate to **💳 Payments** in the header
2. See summary cards:
   - Pending Bills count
   - Paid Bills count
   - Total Amount Paid
3. Switch between **Pending Bills** and **Payment History** tabs

### Member - Making a Payment

1. Go to **💳 Payments** → **Pending Bills** tab
2. Find the bill you want to pay
3. Click **Pay Now**
4. Select payment method:
   - 💳 Credit Card
   - 💳 Debit Card
   - 🅿️ PayPal
   - 🏦 Bank Transfer
5. Enter payment details
6. Click **Pay [Amount]** button
7. Confirmation message appears
8. Bill moves to Payment History

## API Integration (Future Enhancement)

For production use, integrate with payment gateways:

### Stripe Integration
```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('your-publishable-key');
const { error } = await stripe.redirectToCheckout({
  lineItems: [{ price: 'price_id', quantity: 1 }],
  mode: 'payment',
  successUrl: `${window.location.origin}/payments?success=true`,
  cancelUrl: `${window.location.origin}/payments?canceled=true`,
});
```

### PayPal Integration
```javascript
<PayPalButtons
  createOrder={(data, actions) => {
    return actions.order.create({
      purchase_units: [{
        amount: { value: bill.amount }
      }]
    });
  }}
  onApprove={async (data, actions) => {
    await actions.order.capture();
    await recordPayment(paymentData);
  }}
/>
```

## Services

### `billingService.js`
- `createBill(billData)` - Create new bill
- `getOrganizationBills(organizationId)` - Get all bills for organization
- `getMemberBills(memberId, organizationId)` - Get bills for member
- `recordPayment(paymentData)` - Record a payment
- `getBillPayments(billId)` - Get all payments for a bill
- `getMemberPaymentStatus(billId, memberId)` - Check if member paid
- `updateBillStatus(billId, status)` - Update bill status
- `getMemberPaymentHistory(memberId, organizationId)` - Get payment history

## Pages

### `/billing` - BillingManagement.js (Admin Only)
- Create and manage bills
- View all bills for organization
- Track payments and payment history
- Cancel bills
- View detailed bill information with payment list

### `/payments` - MemberPayments.js (All Users)
- View pending bills
- Make payments
- View payment history
- Track total amounts paid
- Summary dashboard with statistics

## Styling

Both pages follow the Teams design theme:
- Primary color: #6264a7 (Teams purple)
- Card-based layouts
- Responsive grid systems
- Modern form inputs
- Status badges
- Modal dialogs

## Security

- All routes protected by authentication
- Billing management restricted to account owners
- Firestore rules enforce data access control
- Payment information should be encrypted (add SSL/TLS)
- Never store full credit card numbers (use tokenization)

## Future Enhancements

1. **Email Notifications**: Send emails when bills are created or payments received
2. **Automated Reminders**: Remind members of upcoming due dates
3. **Recurring Billing**: Auto-charge for subscriptions
4. **Payment Plans**: Split bills into installments
5. **Receipt Generation**: Auto-generate PDF receipts
6. **Analytics Dashboard**: Charts and reports for financial insights
7. **Export to CSV**: Download payment reports
8. **Multi-Currency Support**: Handle different currencies
9. **Tax Calculations**: Add tax rates to bills
10. **Refund System**: Handle payment refunds

## Testing

1. Create test organization as account owner
2. Invite test members
3. Create various bill types (one-time, subscription)
4. Make test payments as members
5. Verify payment records in Firestore
6. Test bill cancellation
7. Check payment history accuracy

## Support

For issues or questions:
- Check Firebase Console for Firestore data
- Review browser console for errors
- Verify Firestore security rules are published
- Ensure user has proper role (owner vs member)
