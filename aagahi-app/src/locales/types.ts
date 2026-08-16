/**
 * ============================================================================
 * @file types.ts
 * @title Aagahi Localization Dictionary Type Definitions
 * @description
 * Defines the strict structural typing contract for all language translation 
 * dictionaries across the Aagahi platform. Ensures absolute compile-time safety 
 * for both English and Urdu text keys.
 * 
 * @architecture
 * - STRICT CONTRACT: By forcing both `en.ts` and `ur.ts` to implement this 
 *   interface, TypeScript mathematically guarantees that no translation key is 
 *   ever missing from either dictionary, completely eradicating "undefined text" 
 *   crashes at runtime.
 * - MODULAR NAMESPACING: Keys are structurally grouped by their target UI 
 *   component/screen to maintain memory organization and prevent namespace collisions.
 * 
 * @upgrades_in_this_build
 * - PROFILE HUB KEYS: Injected comprehensive keys for the new User Operations Hub, 
 *   including dynamic activity tracking and the robust infrastructure survey.
 * - DASHBOARD OVERHAUL KEYS: Added keys for the new "Community Safety Status" 
 *   banner and localized supplementary action descriptions.
 * ============================================================================
 */

/**
 * @interface TranslationDictionary
 * @description The master interface mapping every single localized string in the application.
 * Any property added here MUST be implemented in all language files natively.
 */
export interface TranslationDictionary {
    
    // ==========================================
    // DASHBOARD & MASTER HUD KEYS
    // ==========================================
    dashboardTitle: string;
    languageToggleLabel: string;
    welcomeMessage: string;
    loadingText: string;
    errorText: string;
    greeting: string;
    safe_path_title: string;
    start_placeholder: string;
    dest_placeholder: string;
    find_route: string;
    
    // NEW: Dashboard UI Upgrade Keys
    dashboard_banner_title: string;
    dashboard_banner_sub: string;
    dashboard_section_core: string;
    dashboard_map_desc: string;
    dashboard_safe_desc: string;
    dashboard_report_desc: string;
    dashboard_scan_desc: string;
    dashboard_warden_desc: string;
    dashboard_shop_desc: string;
    dashboard_chat_desc: string;
    
    // ==========================================
    // FLOATING ACTION BUTTON (FAB) RAIL
    // ==========================================
    fab_navigate: string;
    fab_chat: string;
    fab_warden: string;
    fab_portal: string;
    fab_scan: string;
    fab_report: string;
    fab_blockage: string;
    fab_fund: string;

    // ==========================================
    // NEW: PROFILE & TELEMETRY HUB KEYS
    // ==========================================
    profile_header_title: string;
    profile_default_user: string;
    profile_default_email: string;
    profile_shop_title: string;
    
    profile_ops_title: string;
    profile_ops_empty: string;
    profile_ops_initiated: string;
    
    profile_survey_title: string;
    profile_survey_sub: string;
    profile_survey_q1: string;
    profile_survey_q1_ph: string;
    profile_survey_q2: string;
    profile_survey_q2_ph: string;
    profile_survey_q3: string;
    profile_survey_q3_ph: string;
    profile_survey_q4: string;
    profile_survey_q4_ph: string;
    profile_survey_btn: string;
    profile_survey_btn_loading: string;
    
    profile_help_title: string;
    profile_help_sub: string;
    profile_logout_btn: string;
    
    profile_alert_val_title: string;
    profile_alert_val_msg: string;
    profile_alert_succ_title: string;
    profile_alert_succ_msg: string;
    profile_alert_err_title: string;
    profile_alert_err_msg: string;

    // ==========================================
    // CHAT SCREEN KEYS
    // ==========================================
    chat_header_title: string;
    chat_back_btn: string;
    chat_new_zone: string;
    chat_cancel: string;
    chat_create: string;
    chat_placeholder_new_zone: string;
    chat_public_zone: string;
    chat_empty: string;
    chat_loading: string;
    chat_input_placeholder: string;
    chat_video_title: string;
    chat_video_sub: string;
    chat_file_sub: string;

    // ==========================================
    // UNIFIED REPORTING SCREEN KEYS
    // ==========================================
    report_back_btn: string;
    report_header_title: string;
    report_step1_title: string;
    report_step1_desc: string;
    report_map_fallback: string;
    report_primary_marker: string;
    report_secondary_marker: string;
    report_step2_title: string;
    report_cat_road: string;
    report_cat_fire: string;
    report_cat_struct: string;
    report_cat_water: string;
    report_cat_elec: string;
    report_step3_title: string;
    report_placeholder_desc: string;
    report_submit_btn: string;
    report_alert_val_title: string;
    report_alert_val_msg: string;
    report_alert_succ_title: string;
    report_alert_succ_msg: string;
    report_alert_ack: string;
    report_alert_db_err: string;
    report_alert_conn_err: string;

    // ==========================================
    // SHOPKEEPER PORTAL KEYS
    // ==========================================
    shop_header_subtitle: string;
    shop_header_title: string;
    shop_qr_title: string;
    shop_qr_desc: string;
    shop_qr_hash_label: string;
    shop_comp_title: string;
    shop_comp_desc: string;
    shop_score_label: string;
    shop_geo_title: string;
    shop_geo_desc: string;
    shop_btn_calibrate: string;
    shop_check_title: string;
    shop_check_desc: string;
    shop_chk_extinguisher: string;
    shop_chk_wiring: string;
    shop_chk_exits: string;
    shop_chk_lights: string;
    shop_chk_flammables: string;
    shop_chk_gas: string;
    shop_chk_ventilation: string;
    shop_btn_update: string;
    shop_alert_sync_title: string;
    shop_alert_sync_msg: string; 
    shop_alert_err_title: string;
    shop_alert_err_msg: string;
    shop_alert_conn_title: string;
    shop_alert_conn_msg: string;
    shop_geo_alert_title: string;
    shop_geo_alert_msg: string;

    // ==========================================
    // WARDEN ADMINISTRATION KEYS
    // ==========================================
    warden_back_btn: string;
    warden_header_title: string;
    warden_queue_title: string;
    warden_pending_badge: string;
    warden_queue_empty_title: string;
    warden_queue_empty_sub: string;
    warden_active_title: string;
    warden_active_badge: string;
    warden_active_empty_title: string;
    warden_active_empty_sub: string;
    warden_card_pending_badge: string;
    warden_card_reporter_prefix: string;
    warden_card_no_context: string;
    warden_card_spatial_prefix: string;
    warden_btn_authorize: string;
    warden_btn_reject: string;
    warden_card_live_badge: string;
    warden_card_active_no_context: string;
    warden_card_active_spatial_prefix: string;
    warden_btn_resolve: string;
    warden_err_fetch_default: string;
    warden_err_fetch_complex: string;
    warden_err_fetch_conn: string;
    warden_succ_verify_title: string;
    warden_succ_verify_msg: string;
    warden_err_verify_default: string;
    warden_err_verify_complex: string;
    warden_err_verify_title: string;
    warden_err_conn_title: string;
    warden_err_verify_conn: string;
    warden_succ_del_title: string;
    warden_succ_del_msg: string;
    warden_err_del_default: string;
    warden_err_del_complex: string;
    warden_err_del_title: string;
    warden_err_del_conn: string;
    warden_err_net_disturb_title: string;
    warden_err_spatial_enc: string;

    // ==========================================
    // DUAL-SCANNER SYSTEM KEYS
    // ==========================================
    scanner_header_ai: string;
    scanner_header_qr: string;
    scanner_back_btn: string;
    scanner_cam_perm_req: string;
    scanner_btn_grant: string;
    scanner_btn_cancel: string;
    scanner_cap_processing: string;
    scanner_cap_prefix: string;
    scanner_gal_wait: string;
    scanner_gal_choose: string;
    scanner_btn_review: string;
    scanner_rev_heading: string;
    scanner_rev_sub: string;
    scanner_rev_empty: string;
    scanner_rev_retake: string;
    scanner_rev_capture: string;
    scanner_submit_analyzing: string;
    scanner_submit_btn: string;
    scanner_res_verified: string;
    scanner_res_cat: string;
    scanner_res_score: string;
    scanner_btn_scan_another: string;
    scanner_ai_complete: string;
    scanner_ai_based_on: string;
    scanner_ai_hazards: string;
    scanner_ai_seen_in: string;
    scanner_ai_no_hazards: string;
    scanner_ai_recs: string;
    scanner_ai_no_recs: string;
    scanner_ai_action: string;
    scanner_btn_analyze_another: string;
    scanner_err_failed: string;
    scanner_btn_retry: string;
    scanner_step_overview_angle: string;
    scanner_step_overview_title: string;
    scanner_step_overview_sub: string;
    scanner_step_electrical_angle: string;
    scanner_step_electrical_title: string;
    scanner_step_electrical_sub: string;
    scanner_step_exit_angle: string;
    scanner_step_exit_title: string;
    scanner_step_exit_sub: string;
    scanner_step_optional: string;
    scanner_fix_elec_title: string;
    scanner_fix_elec_desc: string;
    scanner_fix_elec_action: string;
    scanner_fix_ext_title: string;
    scanner_fix_ext_desc: string;
    scanner_fix_ext_action: string;
    scanner_fix_block_title: string;
    scanner_fix_block_desc: string;
    scanner_fix_block_action: string;
    scanner_fix_light_title: string;
    scanner_fix_light_desc: string;
    scanner_fix_light_action: string;

    // ==========================================
    // SHARED AUTHENTICATION ROLES
    // ==========================================
    role_citizen: string;
    role_shopkeeper: string;
    role_warden: string;

    // ==========================================
    // IDENTITY GATEKEEPER (LOGIN) KEYS
    // ==========================================
    login_badge: string;
    login_subtitle: string;
    login_context_prefix: string;
    login_email_label: string;
    login_email_placeholder: string;
    login_pass_label: string;
    login_btn: string;
    login_redirect: string;
    login_footer: string;
    login_err_val_title: string;
    login_err_val_msg: string;
    login_err_denied_title: string;
    login_err_denied_msg: string;
    login_err_route_title: string;
    login_err_route_msg: string;
    login_err_fail_title: string;
    login_err_fail_default: string;
    login_err_conn_title: string;
    login_err_conn_msg: string;

    // ==========================================
    // IDENTITY REGISTRATION KEYS
    // ==========================================
    reg_title: string;
    reg_subtitle: string;
    reg_user_label: string;
    reg_user_placeholder: string;
    reg_email_label: string;
    reg_email_placeholder: string;
    reg_contact_label: string;
    reg_contact_placeholder: string;
    reg_store_title: string;
    reg_shop_name_label: string;
    reg_shop_name_placeholder: string;
    reg_shop_cat_label: string;
    reg_shop_cat_placeholder: string;
    reg_pass_label: string;
    reg_btn: string;
    reg_redirect: string;
    reg_err_val_title: string;
    reg_err_val_msg: string;
    reg_err_shop_title: string;
    reg_err_shop_msg: string;
    reg_succ_title: string;
    reg_succ_msg_citizen: string;
    reg_succ_msg_shop: string;
    reg_succ_btn: string;
    reg_err_fail_title: string;
    reg_err_fail_default: string;
    reg_err_conn_title: string;
    reg_err_conn_msg: string;

    // ==========================================
    // ROUTING & EVACUATION SCREEN KEYS
    // ==========================================
    routing_back_btn: string;
    routing_header_title: string;
    routing_map_fallback: string;
    routing_map_epicenter_title: string;
    routing_list_title: string;
    routing_list_facilities: string;
    routing_card_distance: string;
    routing_card_score: string;
    routing_err_fetch: string;
    routing_err_conn: string;

    // ==========================================
    // EXPLORE (DOCUMENTATION) SCREEN KEYS
    // ==========================================
    explore_title: string;
    explore_subtitle: string;
    explore_link_docs: string;
    explore_col1_title: string;
    explore_col1_part1: string;
    explore_col1_part2: string;
    explore_col1_part3: string;
    explore_col1_part4: string;
    explore_link_learn_more: string;
    explore_col2_title: string;
    explore_col2_part1: string;
    explore_col2_part2: string;
    explore_col3_title: string;
    explore_col3_part1: string;
    explore_col3_part2: string;
    explore_col3_part3: string;
    explore_col4_title: string;
    explore_col4_part1: string;
    explore_col4_part2: string;
    explore_col5_title: string;
    explore_col5_part1: string;
    explore_col5_part2: string;
    explore_col5_part3: string;

    // ==========================================
    // CROWD-FUNDING SCREEN KEYS
    // ==========================================
    fund_header_title: string;
    fund_back_btn: string;
    fund_list_title: string;
    fund_btn_start: string;
    fund_btn_close: string;
    fund_form_title: string;
    fund_form_sub: string;
    fund_lbl_title: string;
    fund_ph_title: string;
    fund_lbl_district: string;
    fund_ph_district: string;
    fund_lbl_target: string;
    fund_ph_target: string;
    fund_lbl_raised: string;
    fund_ph_raised: string;
    fund_lbl_url: string;
    fund_ph_url: string;
    fund_btn_publish: string;
    fund_card_raised: string;
    fund_card_target: string;
    fund_card_donate: string;
    fund_alert_val_title: string;
    fund_alert_val_fields: string;
    fund_alert_val_num: string;
    fund_alert_succ_title: string;
    fund_alert_succ_msg: string;
    fund_alert_err_sub: string;
    fund_alert_err_rej: string;
    fund_alert_err_gen_title: string;
    fund_alert_err_gen_msg: string;
    fund_alert_nav_title: string;
    fund_alert_nav_msg: string;
    fund_alert_err_route: string;
}