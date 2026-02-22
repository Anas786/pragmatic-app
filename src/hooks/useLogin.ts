import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
// import { login } from 'src/networking';
import { ILogin, RootStackParamList } from 'src/types';
import { LoginSchema } from 'src/utils';

export const useLogin = () => {
  const { navigate } =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
    console.log('Login submitted');
    setLoading(true);
    try {
      // await login(data);
      console.log('Login successful');
      navigate('Dashboard');
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
