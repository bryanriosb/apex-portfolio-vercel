-- Migration: Create default delivery strategies on business creation
-- Date: 2026-02-24
-- Description: Automatically creates two default delivery strategies when a new business is created

-- Function to create default delivery strategies for a business
CREATE OR REPLACE FUNCTION create_default_delivery_strategies(p_business_id UUID)
RETURNS void AS $$
BEGIN
    -- Insert "Recuperación de Reputación" strategy (conservative)
    INSERT INTO delivery_strategies (
        business_id,
        name,
        description,
        strategy_type,
        is_default,
        is_active,
        rampup_day_1_limit,
        rampup_day_2_limit,
        rampup_day_3_5_limit,
        rampup_day_6_plus_limit,
        batch_size,
        batch_interval_minutes,
        max_batches_per_day,
        concurrent_batches,
        min_open_rate_threshold,
        min_delivery_rate_threshold,
        max_bounce_rate_threshold,
        max_complaint_rate_threshold,
        pause_on_high_bounce,
        pause_on_complaint,
        auto_resume_after_minutes,
        max_retry_attempts,
        retry_interval_minutes,
        respect_timezone,
        preferred_send_hour_start,
        preferred_send_hour_end,
        avoid_weekends,
        created_by
    ) VALUES (
        p_business_id,
        'Recuperación de Reputación',
        'Estrategia ultra conservadora para dominios con problemas de reputación. Enfocada en recuperar trust con ISPs mediante engagement extremadamente positivo.',
        'conservative',
        false,
        true,
        10,
        20,
        30,
        50,
        10,
        120,
        50,
        1,
        25.00,
        98.00,
        2.00,
        0.10,
        true,
        true,
        360,
        3,
        30,
        true,
        9,
        17,
        true,
        null
    );

    -- Insert "Ramp-Up Gradual Estándar" strategy (ramp_up) - Default
    INSERT INTO delivery_strategies (
        business_id,
        name,
        description,
        strategy_type,
        is_default,
        is_active,
        rampup_day_1_limit,
        rampup_day_2_limit,
        rampup_day_3_5_limit,
        rampup_day_6_plus_limit,
        batch_size,
        batch_interval_minutes,
        max_batches_per_day,
        concurrent_batches,
        min_open_rate_threshold,
        min_delivery_rate_threshold,
        max_bounce_rate_threshold,
        max_complaint_rate_threshold,
        pause_on_high_bounce,
        pause_on_complaint,
        auto_resume_after_minutes,
        max_retry_attempts,
        retry_interval_minutes,
        respect_timezone,
        preferred_send_hour_start,
        preferred_send_hour_end,
        avoid_weekends,
        created_by
    ) VALUES (
        p_business_id,
        'Ramp-Up Gradual Estándar',
        'Estrategia conservadora para nuevos dominios. Incrementa volumen gradualmente mientras mantiene engagement positivo. Ideal para evitar spam filters.',
        'ramp_up',
        true,
        true,
        50,
        100,
        150,
        200,
        50,
        60,
        50,
        1,
        20.00,
        95.00,
        5.00,
        0.10,
        true,
        true,
        360,
        3,
        30,
        true,
        9,
        17,
        true,
        null
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to call create_default_delivery_strategies after business insert
CREATE OR REPLACE FUNCTION trigger_create_default_delivery_strategies()
RETURNS TRIGGER AS $$
BEGIN
    -- Call the function to create default strategies for the new business
    PERFORM create_default_delivery_strategies(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on businesses table
DROP TRIGGER IF EXISTS create_default_strategies_on_business_insert ON businesses;
CREATE TRIGGER create_default_strategies_on_business_insert
    AFTER INSERT ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_delivery_strategies();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_default_delivery_strategies(UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION trigger_create_default_delivery_strategies() TO postgres, anon, authenticated, service_role;

-- Add RLS policy to allow service_role to insert delivery strategies (required for trigger)
DROP POLICY IF EXISTS "Service role can manage all strategies" ON delivery_strategies;
CREATE POLICY "Service role can manage all strategies" 
    ON delivery_strategies FOR ALL 
    TO service_role
    USING (true) 
    WITH CHECK (true);

-- Add comment for documentation
COMMENT ON FUNCTION create_default_delivery_strategies(UUID) IS 'Creates two default delivery strategies (conservative and ramp_up) for a given business_id';
COMMENT ON FUNCTION trigger_create_default_delivery_strategies() IS 'Trigger function that automatically creates default delivery strategies when a new business is created';
