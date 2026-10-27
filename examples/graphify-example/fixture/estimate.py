from shipping import shipping_fee

def delivery_estimate(subtotal_yen):
    return {"shipping_yen": shipping_fee(subtotal_yen)}
