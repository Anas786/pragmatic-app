import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
// import { login } from 'src/networking';
import { ILogin, RootStackParamList } from 'src/types';
import { LoginSchema } from 'src/utils';
import { useUserStore } from './useUserStore';

export const useLogin = () => {
  const { navigate } =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setUser } = useUserStore();
  const { handleSubmit, control, formState } = useForm<ILogin>({
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onSubmit',
    resolver: yupResolver(LoginSchema),
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      // await login(data);

      // Set mock user data
      setUser({
        user_id: 1,
        name: 'Muhammad Anas',
        email: 'anas@pragmatic.com',
        phone: '+92 300 1234567',
        company_id: 1,
        company: 'Pragmatic Engineering Solutions',
        login_date: new Date(),
      });

      navigate('Drawer');
    } catch (error) {
      Alert.alert('Login Failed', error as string);
    } finally {
      setLoading(false);
    }
  };

  return {
    control,
    onSubmit: handleSubmit(onSubmit),
    errors: formState.errors,
    loading,
  };
};
