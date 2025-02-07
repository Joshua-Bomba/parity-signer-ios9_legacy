// Copyright 2015-2020 Parity Technologies (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

import React, { useContext, useEffect, useReducer } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NETWORK_LIST, NetworkProtocols } from 'constants/networkSpecs';
import { AccountsContext } from 'stores/AccountsContext';
import { Account, UnlockedAccount } from 'types/identityTypes';
import { NetworkParams } from 'types/networkSpecsTypes';
import { NavigationProps } from 'types/props';
import colors from 'styles/colors';
import AccountCard from 'components/AccountCard';
import AccountIconChooser from 'components/AccountIconChooser';
import Button from 'components/Button';
import DerivationPathField from 'components/DerivationPathField';
import KeyboardScrollView from 'components/KeyboardScrollView';
import TextInput from 'components/TextInput';
import fonts from 'styles/fonts';
import { emptyAccount, validateSeed } from 'utils/account';
import { constructSURI } from 'utils/suri';
import fontStyles from 'styles/fontStyles';

interface State {
	derivationPassword: string;
	derivationPath: string;
	isDerivationPathValid: boolean;
	selectedAccount: undefined | Account;
	selectedNetwork: undefined | NetworkParams;
	newAccount?: Account;
}

export default function AccountNew({
	navigation
}: NavigationProps<'AccountNew'>): React.ReactElement {
	const accountsStore = useContext(AccountsContext);
	const initialState = {
		derivationPassword: '',
		derivationPath: '',
		isDerivationPathValid: true,
		selectedAccount: undefined,
		selectedNetwork: undefined
	};

	const reducer = (state: State, delta: Partial<State>): State => ({
		...state,
		...delta
	});
	const [state, updateState] = useReducer(reducer, initialState);

	useEffect((): void => {
		accountsStore.updateNew(emptyAccount());
	}, [accountsStore]);

	useEffect((): void => {
		const selectedAccount = accountsStore.state.newAccount;
		const selectedNetwork = NETWORK_LIST[selectedAccount.networkKey];
		updateState({
			selectedAccount,
			selectedNetwork
		});
	}, [accountsStore.state.newAccount]);

	const {
		derivationPassword,
		derivationPath,
		isDerivationPathValid,
		selectedAccount,
		selectedNetwork
	} = state;
	if (!selectedAccount) return <View />;

	const { address, name, validBip39Seed } = selectedAccount;
	const seed = (selectedAccount as UnlockedAccount)?.seed;
	const isSubstrate = selectedNetwork!.protocol === NetworkProtocols.SUBSTRATE;

	return (
		<KeyboardScrollView>
			<View style={styles.body}>
				<Text style={styles.titleTop}>CREATE ACCOUNT</Text>
				<Text style={styles.title}>NETWORK</Text>
			</View>
			<AccountCard
				address={''}
				title={selectedNetwork!.title}
				networkKey={selectedAccount.networkKey}
				onPress={(): void => navigation.navigate('LegacyNetworkChooser')}
			/>
			<View style={styles.body}>
				<Text style={styles.title}>ICON & ADDRESS</Text>
				<AccountIconChooser
					derivationPassword={derivationPassword}
					derivationPath={derivationPath}
					onSelect={({ newAddress, isBip39, newSeed }): void => {
						if (newAddress && isBip39 && newSeed) {
							if (isSubstrate) {
								try {
									const suri = constructSURI({
										derivePath: derivationPath,
										password: derivationPassword,
										phrase: newSeed
									});

									accountsStore.updateNew({
										address: newAddress,
										derivationPassword,
										derivationPath,
										seed: suri,
										seedPhrase: newSeed,
										validBip39Seed: isBip39
									});
								} catch (e) {
									console.error(e);
								}
							} else {
								// Ethereum account
								accountsStore.updateNew({
									address: newAddress,
									seed: newSeed,
									validBip39Seed: isBip39
								});
							}
						} else {
							accountsStore.updateNew({
								address: '',
								seed: '',
								validBip39Seed: false
							});
						}
					}}
					network={selectedNetwork!}
					value={address && address}
				/>
				<Text style={styles.title}>NAME</Text>
				<TextInput
					onChangeText={(input: string): void =>
						accountsStore.updateNew({ name: input })
					}
					value={name}
					placeholder="Enter a new account name"
				/>
				{isSubstrate && (
					<DerivationPathField
						onChange={(newDerivationPath: {
							derivationPassword: string;
							derivationPath: string;
							isDerivationPathValid: boolean;
						}): void => {
							updateState({
								derivationPassword: newDerivationPath.derivationPassword,
								derivationPath: newDerivationPath.derivationPath,
								isDerivationPathValid: newDerivationPath.isDerivationPathValid
							});
						}}
						styles={styles}
					/>
				)}
				<View style={styles.bottom}>
					<Text style={styles.hintText}>
						Next, you will be asked to backup your account, get a pen and some
						paper.
					</Text>
					<Button
						title="Next Step"
						disabled={
							!validateSeed(seed, validBip39Seed).valid ||
							!isDerivationPathValid
						}
						onPress={(): void => {
							navigation.navigate('LegacyAccountBackup', {
								isNew: true
							});
						}}
					/>
				</View>
			</View>
		</KeyboardScrollView>
	);
}

const styles = StyleSheet.create({
	body: {
		padding: 16
	},
	bodyContainer: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'space-between'
	},
	bottom: {
		flexBasis: 50,
		paddingBottom: 15
	},
	hintText: {
		color: colors.text.faded,
		fontFamily: fonts.bold,
		fontSize: 12,
		paddingTop: 20,
		textAlign: 'center'
	},
	title: {
		...fontStyles.h_subheading,
		color: colors.text.main
	},
	titleTop: {
		color: colors.text.main,
		fontFamily: fonts.bold,
		fontSize: 24,
		paddingBottom: 20,
		textAlign: 'center'
	}
});
