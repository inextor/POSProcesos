# Data Models

All model interfaces are defined in `src/app/modules/shared/RestModels/` (155+ files) and re-exported via `src/app/modules/shared/RestModels.ts`.

## Key Model Interfaces

### User

**File:** `RestModels/User.ts`

```typescript
export interface User {
    id: number;
    name: string;
    username: string | null;
    password: string | null;
    email: string | null;
    phone: string | null;
    type: 'CLIENT' | 'USER';
    status: 'ACTIVE' | 'DELETED';
    store_id: number | null;
    image_id: number | null;
    price_type_id: number | null;
    credit_days: number | null;
    credit_limit: number;
    points: number;
    lat: number | null;
    lng: number | null;
    code: string | null;
    production_area_id: number | null;
    workshift_id: number | null;
    platform_client_id: number | null;
    default_billing_address_id: number | null;
    default_shipping_address_id: number | null;
    created: Date;
    updated: Date;
    created_by_user_id: number | null;
    updated_by_user_id: number | null;
}
```

### Store

**File:** `RestModels/Store.ts`

The central multi-store entity. Every major operation is scoped to a store.

```typescript
export interface Store {
    id: number;
    name: string | null;
    code: string | null;
    status: 'ACTIVE' | 'DISABLED';
    business_name: string | null;
    rfc: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zipcode: string | null;
    phone: string | null;
    lat: number | null;
    lng: number | null;
    image_id: number | null;
    client_user_id: number | null;
    default_currency_id: string;
    default_billing_data_id: number | null;
    price_list_id: number;
    tax_percent: number;
    max_cash_amount: number;
    suggested_tip: number;
    paypal_email: string | null;
    main_pc_ip: string | null;
    production_enabled: number | null;
    sales_enabled: number | null;
    offline_search_enabled: number;
    print_receipt_copies: number;
    printer_ticket_config: string | null;
    ticket_footer_text: string | null;
    ticket_image_id: number | null;
    qr_size: 'PERCENT_25' | 'PERCENT_50' | 'PERCENT_75' | 'PERCENT_100';
    show_facturacion_qr: 'NO' | 'YES';
    modo_facturacion: 'DESGLOSADA' | 'COMPACTA';
    autofacturacion_settings: 'ONLY_SAME_MONTH' | 'ONLY_DAY_LIMIT' | 'BOTH' | 'DISABLED';
    default_sat_serie: string;
    default_claveprodserv: string;
    default_sat_item_name: string;
    pos_category_preferences: 'DEFAULT_BY_PRODUCT' | 'HIDE_BY_DEFAULT' | 'SHOW_BY_DEFAULT';
    accept_cash: number;
    accept_credit_card: number;
    accept_check: number;
    accept_transfer: number;
    electronic_transfer_percent_fee: number | null;
    created: Date;
    updated: Date;
    created_by_user_id: number | null;
    updated_by_user_id: number | null;
}
```

### Order

**File:** `RestModels/Order.ts`

```typescript
export interface Order {
    id: number;
    store_id: number;
    status: 'PENDING' | 'CANCELLED' | 'ACTIVE' | 'CLOSED';
    service_type: 'TOGO' | 'IN_PLACE' | 'PICK_UP' | 'QUICK_SALE';
    paid_status: 'PENDING' | 'PAID' | 'PARTIALLY_PAID';
    delivery_status: 'PENDING' | 'SENT' | 'DELIVERED' | 'CANCELLED' | 'READY_TO_PICKUP';
    facturado: 'NO' | 'YES';
    marked_for_billing: 'YES' | 'NO';
    client_user_id: number | null;
    client_name: string | null;
    cashier_user_id: number | null;
    delivery_user_id: number | null;
    cancelled_by_user_id: number | null;
    price_type_id: number;
    currency_id: string;
    store_consecutive: number | null;
    subtotal: number;
    discount: number;
    discount_calculated: number;
    shipping_cost: number;
    initial_payment: number;
    amount_paid: number;
    guests: number | null;
    period_id: number | null;
    quote_id: number | null;
    billing_data_id: number | null;
    billing_address_id: number | null;
    address: string | null;
    city: string | null;
    lat: number | null;
    lng: number | null;
    note: string | null;
    cancellation_reason: string | null;
    cancellation_timestamp: Date | null;
    closed_timestamp: Date | null;
    paid_timetamp: Date | null;
    facturacion_code: string;
    ares: number | null;
    authorized_by: string | null;
    created: Date;
}
```

### Payment

**File:** `RestModels/Payment.ts`

```typescript
export interface Payment {
    id: number;
    store_id: number;
    order_id: number;
    payment_type: string;
    amount: number;
    reference: string | null;
    status: string;
    created: Date;
    // ... additional fields
}
```

### Item (Product)

**File:** `RestModels/Item.ts`

```typescript
export interface Item {
    id: number;
    name: string;
    code: string | null;
    category_id: number;
    description: string | null;
    status: 'ACTIVE' | 'DELETED';
    unit: string;
    price: number;
    cost: number;
    image_id: number | null;
    // ... additional fields
}
```

### Full Model List

All 155+ model interfaces exported from `RestModels.ts`:

Account, Address, Album_Image, Album, Answer, Attachment, Attribute, Bank_Account, Bank_Movement_Bill, Bank_Movement_Order, Bank_Movement, Batch_Record, Billing_Data, Bill, Box_Content, Box, Brand, Cart_Item, Cash_Close, Cash_Count, Cashier_Withdrawal, Category_Store, Category_Tree, Category, Category_Type, Check_In_Raw, Check_In, Commanda, Commanda_Type, Consumption, Consumption_User, Currency_Rate, Currency, Delivery_Assignment, Ecommerce_Item_Profile, Ecommerce_Item_Role, Ecommerce_Item, Ecommerce_Role_Item, Ecommerce, Ecommerce_User, File_Type, Form, Fund, Image, Ingredient, Installment, Item_Attachment, Item_Attribute, Item_Exception, Item_Image, Item_Online, Item_Option, Item_Option_Value, Item_Provider, Item_Points, Item_Recipe, Item_Store, Item_Transform, Item, Keyboard_Shortcut, Labels, Ledger_Category, Ledger_Detail, Ledger, Merma, Notification_Token, Offer, Order_Item_Cost, Order_Item_Exception, Order_Item_Response, Order_Item_Serial, Order_Item, Order_Offer, Order, Pallet_Content, Pallet, Payment, Paypal_Access_Token, Paypal_Order, Payroll_Concept, Payroll, Payroll_Value, Period, Pharos_Credentials, Pharos_Payment_Request, Points_Log, Post, Preferences, Price_List, Price_Log, Price, Price_Type, Printer, Process_Status, Process, Production_Area_Item, Production_Area, Production, Production_User, Product, Profile, Purchase_Detail, Purchase, Push_Notification, Question_Choice, Question, Quote_Item, Quote_Request, Quote, Requisition_Item, Requisition, Reservation_Item_Assign, Reservation_Item_Serial, Reservation_Item, Reservation, Response, Return_Assignment, Returned_Item, Returns, Role_Item_Price, Role, Sat_Factura, Sat_Response, Serial_Image, Serial_Log, Serial, Serie_Counter, Session, Shipping_Item, Shipping, Stock_Alert, Stock_Record, Stocktake_Item, Stocktake_Scan, Stocktake, Storage_Item, Storage_Serial, Storage, Storage_Type, Store_Bank_Account, Store_Sale_Report, Store, Table, Task_Comment, Task, Ticket, Unidad_Medida_Sat, User_Attachment, User_Extra_Fields, User_Permission, User, Withdrawal, Work_Log_Rules, Work_Log, Workshift, Transformation, Transformation_Input, Transformation_Output

## Empty Model Factories

See [Core Classes > GetEmpty](/docs/core-classes.md#getempty) for factory functions that create initialized empty model objects.
