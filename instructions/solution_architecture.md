```mermaid
flowchart TB
    %% Define subgraphs for bounded contexts
    subgraph SupabaseDB["Supabase Database"]
        users["users\n- id (UUID, PK)\n- email\n- stripe_customer_id\n- created_at\n- updated_at"]
        credit_purchases["credit_purchases\n- id (UUID, PK)\n- user_id (FK)\n- credit_amount\n- remaining_credits\n- stripe_session_id\n- purchase_date\n- expires_at\n- created_at"]
        credit_usage["credit_usage\n- id (UUID, PK)\n- purchase_id (FK)\n- user_id (FK)\n- request_payload\n- response_payload\n- http_status\n- created_at"]
    end

    subgraph StripeSystem["Stripe Payment System"]
        stripe_customers["stripe_customers\n- id (cus_...)\n- email\n- metadata (supabase_user_id)"]
        stripe_products["stripe_products\n- id (prod_...)\n- name\n- metadata (credit_amount)"]
        stripe_prices["stripe_prices\n- id (price_...)\n- product_id\n- unit_amount\n- currency"]
        stripe_checkout_sessions["stripe_checkout_sessions\n- id (cs_...)\n- customer\n- payment_status\n- line_items"]
    end

    subgraph EdgeFunctions["Supabase Edge Functions"]
        edge_stripe_webhook["stripe-webhook\nPOST /stripe-webhook\nProcesses Stripe events"]
        edge_create_checkout["create-checkout\nPOST /create-checkout\nCreates Stripe sessions"]
        edge_get_customer["get-customer\nPOST /get-customer\nManages Stripe customers"]
        edge_use_credit["use-credit\nPOST /use-credit\nHandles API requests"]
    end

    %% Relationships between database entities
    users --> credit_purchases
    users --> credit_usage
    credit_purchases --> credit_usage

    %% Relationships between Stripe entities
    stripe_customers --> stripe_checkout_sessions
    stripe_products --> stripe_prices
    stripe_prices --> stripe_checkout_sessions

    %% Cross-system relationships (with dashed lines)
    stripe_customers -.-> users
    stripe_checkout_sessions -.-> credit_purchases

    %% Edge function relationships
    edge_stripe_webhook --> stripe_checkout_sessions
    edge_stripe_webhook --> credit_purchases
    edge_create_checkout --> stripe_checkout_sessions
    edge_get_customer --> stripe_customers
    edge_use_credit --> credit_usage

    %% Styling
    classDef supabase fill:#f5f5f5,stroke:#333,stroke-width:2px
    classDef stripe fill:#d1e7dd,stroke:#0d6832,stroke-width:2px
    classDef edgefn fill:#d2f4ea,stroke:#0dcaf0,stroke-width:2px

    class SupabaseDB supabase
    class StripeSystem stripe
    class EdgeFunctions edgefn

```