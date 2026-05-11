import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULTS = {
  min_withdrawal: 50,
  app_name: 'Chamba App',
  maintenance_mode: false,
  announcement: '',
  min_version: '1.0.0',
  store_url: 'https://play.google.com/store/apps/details?id=com.chamba.app',
};

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from('app_config')
      .select('*')
      .eq('id', 'global_settings')
      .single()
      .then(({ data }) => {
        if (data?.value) setSettings(data.value);
      });
  }, []);

  const save = async (values) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ id: 'global_settings', value: values, updated_at: new Date().toISOString() });
      if (error) throw error;
      return null;
    } catch (e) {
      return e;
    } finally {
      setLoading(false);
    }
  };

  return { settings, setSettings, loading, save };
}
