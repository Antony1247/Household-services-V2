export default {
    template: `
        <div class="container mt-5">
            <h1 class="text-center">Customer Registration</h1>
            <div v-if="message" class="alert" :class="{'alert-danger': isError, 'alert-success': !isError}">{{ message }}</div>
            <form @submit.prevent="registerCustomer">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="form-control" v-model="email" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" class="form-control" v-model="password" required>
                </div>
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" class="form-control" v-model="full_name" required>
                </div>
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" class="form-control" v-model="phone_number" pattern="[0-9]{10}" placeholder="Enter 10-digit phone number" required>
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <input type="text" class="form-control" v-model="address" required>
                </div>
                <div class="form-group">
                    <label>Postal Code</label>
                    <input type="text" class="form-control" v-model="postal_code" required>
                </div>
                <button type="submit" class="btn btn-success btn-block">Register</button>
            </form>
        </div>
    `,
    data() {
        return { email: '', password: '', full_name: '',phone_number: '', address: '', postal_code: '', message: '', isError: false };
    },
    methods: {
        async registerCustomer() {
            try {
                const response = await axios.post('/api/register/customer', {
                    email: this.email,
                    password: this.password,
                    full_name: this.full_name,
                    phone_number: this.phone_number,
                    address: this.address,
                    postal_code: this.postal_code
                });
                this.message = response.data.message;
                this.isError = false;
                setTimeout(() => this.$router.push('/login'), 2000);
            } catch (error) {
                this.message = error.response.data.message;
                this.isError = true;
            }
        }
    }
};
